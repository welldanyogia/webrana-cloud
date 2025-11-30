import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, ProvisioningStatus, Order, DoAccount } from '@prisma/client';
import {
  DigitalOceanClientService,
  DropletResponse,
} from './digitalocean-client.service';
import {
  OrderNotFoundException,
  PaymentStatusConflictException,
  ProvisioningFailedException,
  ProvisioningTimeoutException,
} from '../../common/exceptions';
import { DoAccountService } from '../do-account/do-account.service';
import { DoApiClient, Droplet } from '../do-account/do-api.client';
import {
  NoAvailableAccountException,
  AllAccountsFullException,
} from '../do-account/do-account.exceptions';

/**
 * Provisioning Service
 * 
 * Handles the full provisioning lifecycle:
 * 1. Create ProvisioningTask after payment confirmed
 * 2. Call DigitalOcean API to create droplet
 * 3. Poll for droplet status until active/errored/timeout
 * 4. Update Order status to ACTIVE or FAILED
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly pollIntervalMs: number;
  private readonly maxAttempts: number;
  private readonly defaultRegion: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly digitalOceanClient: DigitalOceanClientService,
    private readonly doAccountService: DoAccountService
  ) {
    this.pollIntervalMs = this.configService.get<number>(
      'PROVISIONING_POLL_INTERVAL_MS',
      5000
    );
    this.maxAttempts = this.configService.get<number>(
      'PROVISIONING_MAX_ATTEMPTS',
      60
    );
    this.defaultRegion = this.configService.get<string>(
      'DIGITALOCEAN_DEFAULT_REGION',
      'sgp1'
    );
  }

  /**
   * Start provisioning for an order
   * 
   * This method is called after payment is confirmed (PAID status).
   * 
   * Flow:
   * 1. Validate order exists and status is PAID
   * 2. Select available DO account (multi-account support)
   * 3. Create ProvisioningTask with status PENDING and doAccountId
   * 4. Update order status to PROVISIONING via state machine
   * 5. Call DigitalOcean API to create droplet
   * 6. Save initial droplet metadata
   * 7. Update task status to IN_PROGRESS
   * 8. Start async polling (non-blocking)
   */
  async startProvisioning(orderId: string): Promise<void> {
    this.logger.log(`Starting provisioning for order ${orderId}`);

    // 1. Get and validate order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    // Validate order is in PAID status
    if (order.status !== OrderStatus.PAID) {
      this.logger.error(
        `Cannot start provisioning for order ${orderId}: status is ${order.status}, expected PAID`
      );
      throw new PaymentStatusConflictException(order.status, 'PROVISIONING');
    }

    // 2. Select available DO account (multi-account support)
    let doAccount: (DoAccount & { decryptedToken: string }) | null = null;
    try {
      doAccount = await this.doAccountService.selectAvailableAccount();
      this.logger.log(
        `Selected DO account ${doAccount.name} (${doAccount.id}) for order ${orderId}`
      );
    } catch (error) {
      // If no accounts configured or all full, log and continue with fallback (legacy mode)
      if (
        error instanceof NoAvailableAccountException ||
        error instanceof AllAccountsFullException
      ) {
        this.logger.warn(
          `No multi-account available for order ${orderId}: ${error.message}. Using legacy single-token mode.`
        );
      } else {
        // For other errors, rethrow
        throw error;
      }
    }

    // 3. Create provisioning task with PENDING status (and doAccountId if available)
    const task = await this.prisma.provisioningTask.create({
      data: {
        orderId,
        status: ProvisioningStatus.PENDING,
        doAccountId: doAccount?.id || null,
        doRegion: this.defaultRegion,
        doSize: this.mapPlanToDoSize(order),
        doImage: this.mapImageToDoImage(order),
      },
    });

    this.logger.log(`Created provisioning task ${task.id} for order ${orderId}`);

    // 4. Update order status to PROVISIONING via transaction (state machine)
    await this.updateOrderToProvisioning(orderId, task.id);

    // 5-8. Create droplet and start polling (async, non-blocking)
    setImmediate(async () => {
      try {
        await this.executeProvisioning(task.id, order, doAccount);
      } catch (error) {
        this.logger.error(
          `Provisioning failed for task ${task.id}:`,
          error instanceof Error ? error.message : error
        );
        // Error is handled inside executeProvisioning
      }
    });
  }

  /**
   * Execute the actual provisioning process
   * @private
   */
  private async executeProvisioning(
    taskId: string,
    order: Order,
    doAccount: (DoAccount & { decryptedToken: string }) | null
  ): Promise<void> {
    const dropletName = `vps-${order.id.substring(0, 8)}`;

    try {
      // 5. Call DigitalOcean API to create droplet
      this.logger.log(`Creating droplet for task ${taskId}: ${dropletName}`);

      let droplet: Droplet | DropletResponse;
      let doApiClient: DoApiClient | null = null;

      if (doAccount) {
        // Multi-account mode: use selected account's API client with decrypted token
        this.logger.log(
          `Using DO account ${doAccount.name} for droplet creation`
        );
        doApiClient = new DoApiClient(doAccount.decryptedToken);

        droplet = await doApiClient.createDroplet({
          name: dropletName,
          region: this.defaultRegion,
          size: this.mapPlanToDoSize(order),
          image: this.mapImageToDoImage(order),
          tags: ['webrana', `order-${order.id}`],
          monitoring: true,
        });

        // Increment active count for the account
        await this.doAccountService.incrementActiveCount(doAccount.id);
        this.logger.log(
          `Incremented active droplet count for account ${doAccount.id}`
        );
      } else {
        // Legacy mode: use single-token DigitalOceanClientService
        this.logger.log(
          'Using legacy single-token mode for droplet creation'
        );
        droplet = await this.digitalOceanClient.createDroplet({
          name: dropletName,
          region: this.defaultRegion,
          size: this.mapPlanToDoSize(order),
          image: this.mapImageToDoImage(order),
          tags: ['webrana', `order-${order.id}`],
          monitoring: true,
        });
      }

      // 6. Save initial droplet metadata
      const dropletRegion =
        'region' in droplet && droplet.region?.slug
          ? droplet.region.slug
          : this.defaultRegion;
      const dropletSizeSlug =
        'size_slug' in droplet
          ? droplet.size_slug
          : 'size' in droplet && droplet.size?.slug
            ? droplet.size.slug
            : this.mapPlanToDoSize(order);

      await this.prisma.provisioningTask.update({
        where: { id: taskId },
        data: {
          dropletId: String(droplet.id),
          dropletName: droplet.name,
          dropletStatus: droplet.status,
          doRegion: dropletRegion,
          doSize: dropletSizeSlug,
          startedAt: new Date(),
        },
      });

      // 7. Update task status to IN_PROGRESS
      await this.prisma.provisioningTask.update({
        where: { id: taskId },
        data: { status: ProvisioningStatus.IN_PROGRESS },
      });

      this.logger.log(
        `Droplet ${droplet.id} created, starting polling for task ${taskId}`
      );

      // 8. Start polling (with account client if available)
      await this.pollDropletStatus(taskId, String(droplet.id), doApiClient);
    } catch (error) {
      // Handle creation failure
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error during provisioning';
      this.logger.error(`Droplet creation failed for task ${taskId}: ${errorMessage}`);

      await this.markProvisioningFailed(
        taskId,
        'DROPLET_CREATION_FAILED',
        errorMessage
      );
    }
  }

  /**
   * Poll droplet status until active, errored, or timeout
   * 
   * @param taskId The provisioning task ID
   * @param dropletId The DigitalOcean droplet ID
   * @param doApiClient Optional DoApiClient for multi-account mode (falls back to legacy client)
   */
  async pollDropletStatus(
    taskId: string,
    dropletId: string,
    doApiClient?: DoApiClient | null
  ): Promise<void> {
    this.logger.log(
      `Starting polling for task ${taskId}, droplet ${dropletId} (interval: ${this.pollIntervalMs}ms, max: ${this.maxAttempts})`
    );

    let attempts = 0;

    while (attempts < this.maxAttempts) {
      attempts++;

      try {
        // Get current droplet status (use multi-account client if available)
        let droplet: Droplet | DropletResponse;
        if (doApiClient) {
          droplet = await doApiClient.getDroplet(Number(dropletId));
        } else {
          droplet = await this.digitalOceanClient.getDroplet(dropletId);
        }

        // Update metadata in DB
        await this.updateDropletMetadataGeneric(taskId, droplet, doApiClient);

        this.logger.debug(
          `Poll ${attempts}/${this.maxAttempts}: Droplet ${dropletId} status = ${droplet.status}`
        );

        // Check for terminal states
        if (droplet.status === 'active') {
          this.logger.log(`Droplet ${dropletId} is now active`);
          await this.markProvisioningSuccess(taskId);
          return;
        }

        if (droplet.status === 'errored') {
          this.logger.error(`Droplet ${dropletId} entered error state`);
          await this.markProvisioningFailed(
            taskId,
            'DROPLET_ERRORED',
            'Droplet entered error state during provisioning'
          );
          return;
        }

        // Wait before next poll
        await this.sleep(this.pollIntervalMs);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Polling error';
        this.logger.error(
          `Polling error for task ${taskId} (attempt ${attempts}): ${errorMessage}`
        );

        // Update attempt count
        await this.prisma.provisioningTask.update({
          where: { id: taskId },
          data: { attempts },
        });

        // If it's a fatal error (not just network glitch), fail immediately
        if (this.isFatalError(error)) {
          await this.markProvisioningFailed(taskId, 'POLLING_ERROR', errorMessage);
          return;
        }

        // Continue polling on transient errors
        await this.sleep(this.pollIntervalMs);
      }
    }

    // Max attempts reached - timeout
    this.logger.error(
      `Provisioning timeout for task ${taskId}: max attempts (${this.maxAttempts}) reached`
    );
    await this.markProvisioningFailed(
      taskId,
      'PROVISIONING_TIMEOUT',
      `Droplet did not become active within ${this.maxAttempts * this.pollIntervalMs / 1000} seconds`
    );
  }

  /**
   * Update droplet metadata in ProvisioningTask (legacy method for backward compatibility)
   */
  private async updateDropletMetadata(
    taskId: string,
    droplet: DropletResponse
  ): Promise<void> {
    const publicIp = this.digitalOceanClient.extractPublicIpv4(droplet);
    const privateIp = this.digitalOceanClient.extractPrivateIpv4(droplet);

    await this.prisma.provisioningTask.update({
      where: { id: taskId },
      data: {
        dropletStatus: droplet.status,
        ipv4Public: publicIp,
        ipv4Private: privateIp,
        dropletTags: droplet.tags || [],
        dropletCreatedAt: droplet.created_at
          ? new Date(droplet.created_at)
          : null,
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Update droplet metadata in ProvisioningTask (generic method for multi-account support)
   * 
   * Handles both Droplet (from DoApiClient) and DropletResponse (from legacy client)
   */
  private async updateDropletMetadataGeneric(
    taskId: string,
    droplet: Droplet | DropletResponse,
    doApiClient?: DoApiClient | null
  ): Promise<void> {
    // Extract IPs (both types have the same network structure)
    let publicIp: string | null = null;
    let privateIp: string | null = null;

    if (doApiClient) {
      publicIp = doApiClient.extractPublicIpv4(droplet as Droplet);
      privateIp = doApiClient.extractPrivateIpv4(droplet as Droplet);
    } else {
      publicIp = this.digitalOceanClient.extractPublicIpv4(droplet as DropletResponse);
      privateIp = this.digitalOceanClient.extractPrivateIpv4(droplet as DropletResponse);
    }

    await this.prisma.provisioningTask.update({
      where: { id: taskId },
      data: {
        dropletStatus: droplet.status,
        ipv4Public: publicIp,
        ipv4Private: privateIp,
        dropletTags: droplet.tags || [],
        dropletCreatedAt: droplet.created_at
          ? new Date(droplet.created_at)
          : null,
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * Mark provisioning as successful
   * Updates ProvisioningTask to SUCCESS and Order to ACTIVE
   */
  async markProvisioningSuccess(taskId: string): Promise<void> {
    this.logger.log(`Marking provisioning success for task ${taskId}`);

    const task = await this.prisma.provisioningTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      this.logger.error(`Task ${taskId} not found for success marking`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update task to SUCCESS
      await tx.provisioningTask.update({
        where: { id: taskId },
        data: {
          status: ProvisioningStatus.SUCCESS,
          completedAt: new Date(),
        },
      });

      // Update order to ACTIVE via state machine pattern
      await tx.order.update({
        where: { id: task.orderId },
        data: { status: OrderStatus.ACTIVE },
      });

      // Record status history
      await tx.statusHistory.create({
        data: {
          orderId: task.orderId,
          previousStatus: OrderStatus.PROVISIONING,
          newStatus: OrderStatus.ACTIVE,
          actor: 'system',
          reason: 'Droplet provisioned successfully',
          metadata: {
            provisioningTaskId: taskId,
            dropletId: task.dropletId,
            ipv4Public: task.ipv4Public,
          },
        },
      });
    });

    this.logger.log(
      `Provisioning completed successfully for task ${taskId}, order ${task.orderId} is now ACTIVE`
    );
  }

  /**
   * Mark provisioning as failed
   * Updates ProvisioningTask to FAILED and Order to FAILED
   */
  async markProvisioningFailed(
    taskId: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    this.logger.log(
      `Marking provisioning failed for task ${taskId}: ${errorCode} - ${errorMessage}`
    );

    const task = await this.prisma.provisioningTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      this.logger.error(`Task ${taskId} not found for failure marking`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Update task to FAILED
      await tx.provisioningTask.update({
        where: { id: taskId },
        data: {
          status: ProvisioningStatus.FAILED,
          errorCode,
          errorMessage,
          completedAt: new Date(),
        },
      });

      // Update order to FAILED via state machine pattern
      await tx.order.update({
        where: { id: task.orderId },
        data: { status: OrderStatus.FAILED },
      });

      // Record status history
      await tx.statusHistory.create({
        data: {
          orderId: task.orderId,
          previousStatus: OrderStatus.PROVISIONING,
          newStatus: OrderStatus.FAILED,
          actor: 'system',
          reason: `Provisioning failed: ${errorCode}`,
          metadata: {
            provisioningTaskId: taskId,
            errorCode,
            errorMessage,
          },
        },
      });
    });

    this.logger.log(
      `Provisioning failed for task ${taskId}, order ${task.orderId} is now FAILED`
    );
  }

  /**
   * Get provisioning task by order ID
   */
  async getProvisioningTaskByOrderId(orderId: string) {
    return this.prisma.provisioningTask.findUnique({
      where: { orderId },
    });
  }

  /**
   * Update order status to PROVISIONING (internal helper)
   */
  private async updateOrderToProvisioning(
    orderId: string,
    taskId: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PROVISIONING },
      });

      await tx.statusHistory.create({
        data: {
          orderId,
          previousStatus: OrderStatus.PAID,
          newStatus: OrderStatus.PROVISIONING,
          actor: 'system',
          reason: 'Provisioning started',
          metadata: {
            provisioningTaskId: taskId,
            region: this.defaultRegion,
          },
        },
      });
    });
  }

  /**
   * Map order plan to DigitalOcean size slug
   * In production, this would fetch from catalog-service
   * For now, use a sensible default based on plan name
   */
  private mapPlanToDoSize(order: Order): string {
    // Default mapping - in full implementation, this comes from catalog
    // The plan's providerSizeSlug should be stored or fetched
    return 's-1vcpu-1gb';
  }

  /**
   * Map order image to DigitalOcean image slug
   * In production, this would fetch from catalog-service
   */
  private mapImageToDoImage(order: Order): string {
    // Default mapping - in full implementation, this comes from catalog
    // The image's providerSlug should be stored or fetched
    return 'ubuntu-22-04-x64';
  }

  /**
   * Check if error is fatal (should stop polling immediately)
   */
  private isFatalError(error: unknown): boolean {
    if (error instanceof ProvisioningFailedException) return true;
    if (error instanceof ProvisioningTimeoutException) return true;
    // Add more fatal error types as needed
    return false;
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
