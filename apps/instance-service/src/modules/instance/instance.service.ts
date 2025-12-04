import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  InstanceNotFoundException,
  InstanceAccessDeniedException,
  ActionNotAllowedException,
  ActionNotFoundException,
  RateLimitExceededException,
} from '../../common/exceptions';
import {
  DigitalOceanService,
  DropletActionType,
  DropletActionResponse,
  DropletResponse,
} from '../digitalocean/digitalocean.service';
import { OrderClientService, Order } from '../order-client/order-client.service';

import {
  InstanceActionType,
  InstanceResponseDto,
  InstanceDetailResponseDto,
  ActionResponseDto,
  PaginatedResult,
  PaginationQueryDto,
  ConsoleAccessResponseDto,
} from './dto';

// In-memory rate limiter for actions (simple implementation)
interface RateLimitEntry {
  lastAction: number;
  instanceId: string;
}

/**
 * Instance Service
 * 
 * Manages VPS instances - provides real-time status and actions.
 * Gets instance data from order-service, interacts with DigitalOcean for actions.
 */
@Injectable()
export class InstanceService {
  private readonly logger = new Logger(InstanceService.name);
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly rateLimitWindowMs: number;

  constructor(
    private readonly digitalOceanService: DigitalOceanService,
    private readonly orderClientService: OrderClientService,
    private readonly configService: ConfigService
  ) {
    // Rate limit: 1 action per minute per instance (configurable)
    this.rateLimitWindowMs = this.configService.get<number>(
      'ACTION_RATE_LIMIT_MS',
      60000
    );
  }

  /**
   * Get all instances (active VPS) for a user
   */
  async getInstancesByUserId(
    userId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResult<InstanceResponseDto>> {
    this.logger.log(`Getting instances for user: ${userId}`);

    // Get active orders from order-service
    const orders = await this.orderClientService.getActiveOrdersByUserId(userId);

    // Filter orders that have completed provisioning (have dropletId)
    const activeInstances = orders.filter(
      (order) =>
        order.provisioningTask?.dropletId &&
        order.provisioningTask?.status === 'COMPLETED'
    );

    // Paginate
    const page = query.page || 1;
    const limit = query.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOrders = activeInstances.slice(startIndex, endIndex);

    // Map to instance response DTOs with real-time status from DO
    const instances = await Promise.all(
      paginatedOrders.map((order) => this.mapOrderToInstance(order))
    );

    return {
      data: instances,
      meta: {
        page,
        limit,
        total: activeInstances.length,
        totalPages: Math.ceil(activeInstances.length / limit),
      },
    };
  }

  /**
   * Get single instance by ID (orderId) with real-time status
   */
  async getInstanceById(
    instanceId: string,
    userId: string
  ): Promise<InstanceDetailResponseDto> {
    this.logger.log(`Getting instance: ${instanceId} for user: ${userId}`);

    const order = await this.orderClientService.getOrderById(instanceId);

    if (!order) {
      throw new InstanceNotFoundException(instanceId);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new InstanceAccessDeniedException(instanceId);
    }

    // Verify it's an active instance with completed provisioning
    if (
      order.status !== 'ACTIVE' ||
      !order.provisioningTask?.dropletId ||
      order.provisioningTask?.status !== 'COMPLETED'
    ) {
      throw new InstanceNotFoundException(instanceId);
    }

    return this.mapOrderToInstanceDetail(order);
  }

  /**
   * Trigger an action on an instance
   */
  async triggerAction(
    instanceId: string,
    userId: string,
    actionType: InstanceActionType
  ): Promise<ActionResponseDto> {
    this.logger.log(
      `Triggering action ${actionType} on instance ${instanceId} by user ${userId}`
    );

    // Get and validate instance
    const order = await this.orderClientService.getOrderById(instanceId);

    if (!order) {
      throw new InstanceNotFoundException(instanceId);
    }

    if (order.userId !== userId) {
      throw new InstanceAccessDeniedException(instanceId);
    }

    if (
      order.status !== 'ACTIVE' ||
      !order.provisioningTask?.dropletId ||
      order.provisioningTask?.status !== 'COMPLETED'
    ) {
      throw new ActionNotAllowedException(
        actionType,
        'Instance tidak dalam status aktif atau belum selesai provisioning'
      );
    }

    const dropletId = order.provisioningTask.dropletId;

    // Check rate limit
    this.checkRateLimit(instanceId, userId);

    // Get current droplet status to validate action
    const droplet = await this.digitalOceanService.getDroplet(dropletId);
    this.validateActionAllowed(droplet, actionType);

    // Map action type to DO action type
    const doActionType = this.mapActionType(actionType);

    // Trigger the action
    const action = await this.digitalOceanService.triggerAction(
      dropletId,
      doActionType
    );

    // Update rate limit
    this.updateRateLimit(instanceId, userId);

    return this.mapActionResponse(action);
  }

  /**
   * Get action status
   */
  async getActionStatus(
    instanceId: string,
    actionId: number,
    userId: string
  ): Promise<ActionResponseDto> {
    this.logger.log(
      `Getting action status: instance=${instanceId}, action=${actionId}, user=${userId}`
    );

    // Validate instance ownership
    const order = await this.orderClientService.getOrderById(instanceId);

    if (!order) {
      throw new InstanceNotFoundException(instanceId);
    }

    if (order.userId !== userId) {
      throw new InstanceAccessDeniedException(instanceId);
    }

    if (!order.provisioningTask?.dropletId) {
      throw new InstanceNotFoundException(instanceId);
    }

    const dropletId = order.provisioningTask.dropletId;

    try {
      const action = await this.digitalOceanService.getActionStatus(
        dropletId,
        actionId
      );

      return this.mapActionResponse(action);
    } catch (error) {
      // If DO returns 404 for action, throw our custom exception
      throw new ActionNotFoundException(actionId);
    }
  }

  /**
   * Get console access URL for an instance
   * 
   * Returns a DigitalOcean web console URL for the instance.
   * Validates ownership before returning the URL.
   * 
   * @param instanceId Instance UUID (order ID)
   * @param userId User ID for ownership validation
   * @returns Console access response with URL and metadata
   */
  async getConsoleUrl(
    instanceId: string,
    userId: string
  ): Promise<ConsoleAccessResponseDto> {
    this.logger.log(
      `Getting console URL for instance: ${instanceId}, user: ${userId}`
    );

    // Validate instance ownership
    const order = await this.orderClientService.getOrderById(instanceId);

    if (!order) {
      throw new InstanceNotFoundException(instanceId);
    }

    if (order.userId !== userId) {
      throw new InstanceAccessDeniedException(instanceId);
    }

    // Verify it's an active instance with completed provisioning
    if (
      order.status !== 'ACTIVE' ||
      !order.provisioningTask?.dropletId ||
      order.provisioningTask?.status !== 'COMPLETED'
    ) {
      throw new ActionNotAllowedException(
        'get_console',
        'Console hanya tersedia untuk instance yang sudah aktif dan selesai provisioning'
      );
    }

    const dropletId = order.provisioningTask.dropletId;

    // Get console URL from DigitalOcean service
    const { consoleUrl, dropletStatus } = await this.digitalOceanService.getConsoleUrl(dropletId);

    // Console access is recommended to be refreshed periodically (1 hour expiry recommendation)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    return {
      consoleUrl,
      type: 'web_console',
      expiresAt: expiresAt.toISOString(),
      instructions: dropletStatus === 'active'
        ? 'Klik URL untuk membuka console. Login menggunakan credentials VPS Anda.'
        : `Instance dalam status "${dropletStatus}". Power on instance terlebih dahulu untuk menggunakan console.`,
    };
  }

  /**
   * Map order to basic instance response
   */
  private async mapOrderToInstance(order: Order): Promise<InstanceResponseDto> {
    const task = order.provisioningTask!;
    const item = order.items[0];

    // Get real-time status from DigitalOcean
    let status: 'active' | 'off' | 'new' | 'archive' = 'active';
    let ipAddress = task.ipv4Public;

    if (task.dropletId) {
      try {
        const droplet = await this.digitalOceanService.getDroplet(task.dropletId);
        status = droplet.status;
        ipAddress = this.digitalOceanService.extractPublicIpv4(droplet) || ipAddress;
      } catch (error) {
        this.logger.warn(
          `Failed to get real-time status for droplet ${task.dropletId}: ${error}`
        );
      }
    }

    return {
      id: order.id,
      orderId: order.id,
      hostname: task.dropletName || `vps-${order.id.substring(0, 8)}`,
      ipAddress,
      status,
      plan: {
        name: item.planSnapshot.name,
        cpu: item.planSnapshot.cpu,
        ram: item.planSnapshot.ram,
        ssd: item.planSnapshot.ssd,
      },
      image: {
        name: item.imageSnapshot.name,
        distribution: item.imageSnapshot.distribution,
      },
      region: task.doRegion || 'sgp1',
      createdAt: order.createdAt,
    };
  }

  /**
   * Map order to detailed instance response
   */
  private async mapOrderToInstanceDetail(
    order: Order
  ): Promise<InstanceDetailResponseDto> {
    const task = order.provisioningTask!;
    const item = order.items[0];

    // Get real-time status from DigitalOcean
    let droplet: DropletResponse | null = null;
    let status: 'active' | 'off' | 'new' | 'archive' = 'active';
    let ipAddress = task.ipv4Public;
    let ipAddressPrivate = task.ipv4Private;
    let vcpus = item.planSnapshot.cpu;
    let memory = item.planSnapshot.ram;
    let disk = item.planSnapshot.ssd;

    if (task.dropletId) {
      try {
        droplet = await this.digitalOceanService.getDroplet(task.dropletId);
        status = droplet.status;
        ipAddress = this.digitalOceanService.extractPublicIpv4(droplet) || ipAddress;
        ipAddressPrivate = this.digitalOceanService.extractPrivateIpv4(droplet) || ipAddressPrivate;
        vcpus = droplet.vcpus || vcpus;
        memory = droplet.memory || memory;
        disk = droplet.disk || disk;
      } catch (error) {
        this.logger.warn(
          `Failed to get real-time status for droplet ${task.dropletId}: ${error}`
        );
      }
    }

    return {
      id: order.id,
      orderId: order.id,
      hostname: task.dropletName || `vps-${order.id.substring(0, 8)}`,
      ipAddress,
      ipAddressPrivate,
      status,
      plan: {
        name: item.planSnapshot.name,
        cpu: item.planSnapshot.cpu,
        ram: item.planSnapshot.ram,
        ssd: item.planSnapshot.ssd,
      },
      image: {
        name: item.imageSnapshot.name,
        distribution: item.imageSnapshot.distribution,
      },
      region: task.doRegion || 'sgp1',
      vcpus,
      memory,
      disk,
      doDropletId: task.dropletId!,
      createdAt: order.createdAt,
    };
  }

  /**
   * Map action type from our enum to DO action type
   */
  private mapActionType(actionType: InstanceActionType): DropletActionType {
    const mapping: Record<InstanceActionType, DropletActionType> = {
      [InstanceActionType.REBOOT]: 'reboot',
      [InstanceActionType.POWER_OFF]: 'power_off',
      [InstanceActionType.POWER_ON]: 'power_on',
      [InstanceActionType.RESET_PASSWORD]: 'password_reset',
    };
    return mapping[actionType];
  }

  /**
   * Map DO action response to our DTO
   */
  private mapActionResponse(action: DropletActionResponse): ActionResponseDto {
    return {
      id: action.id,
      type: action.type,
      status: action.status,
      startedAt: action.started_at,
      completedAt: action.completed_at,
    };
  }

  /**
   * Validate that the action is allowed based on current droplet status
   */
  private validateActionAllowed(
    droplet: DropletResponse,
    actionType: InstanceActionType
  ): void {
    const status = droplet.status;

    switch (actionType) {
      case InstanceActionType.POWER_ON:
        if (status !== 'off') {
          throw new ActionNotAllowedException(
            actionType,
            'Power on hanya dapat dilakukan ketika instance dalam status off'
          );
        }
        break;

      case InstanceActionType.POWER_OFF:
      case InstanceActionType.REBOOT:
      case InstanceActionType.RESET_PASSWORD:
        if (status !== 'active') {
          throw new ActionNotAllowedException(
            actionType,
            'Aksi ini hanya dapat dilakukan ketika instance dalam status active'
          );
        }
        break;
    }
  }

  /**
   * Check rate limit for actions
   */
  private checkRateLimit(instanceId: string, userId: string): void {
    const key = `${userId}:${instanceId}`;
    const entry = this.rateLimitMap.get(key);

    if (entry) {
      const timeSinceLastAction = Date.now() - entry.lastAction;
      if (timeSinceLastAction < this.rateLimitWindowMs) {
        const waitSeconds = Math.ceil(
          (this.rateLimitWindowMs - timeSinceLastAction) / 1000
        );
        throw new RateLimitExceededException(instanceId, waitSeconds);
      }
    }
  }

  /**
   * Update rate limit after successful action
   */
  private updateRateLimit(instanceId: string, userId: string): void {
    const key = `${userId}:${instanceId}`;
    this.rateLimitMap.set(key, {
      lastAction: Date.now(),
      instanceId,
    });

    // Clean up old entries periodically (simple cleanup)
    if (this.rateLimitMap.size > 10000) {
      const now = Date.now();
      for (const [k, v] of this.rateLimitMap.entries()) {
        if (now - v.lastAction > this.rateLimitWindowMs * 2) {
          this.rateLimitMap.delete(k);
        }
      }
    }
  }
}
