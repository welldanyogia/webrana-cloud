import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InstanceService } from './instance.service';
import {
  TriggerActionDto,
  PaginationQueryDto,
  InstanceResponseDto,
  InstanceDetailResponseDto,
  ActionResponseDto,
  PaginatedResult,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, CurrentUserData } from '../../common/decorators';

/**
 * Instance Controller
 * 
 * Endpoints for VPS instance management.
 * All endpoints require JWT authentication.
 * 
 * Endpoints:
 * - GET /api/v1/instances - List user's instances
 * - GET /api/v1/instances/:id - Get instance detail with real-time status
 * - POST /api/v1/instances/:id/actions - Trigger action (reboot, power-off, power-on, reset-password)
 * - GET /api/v1/instances/:id/actions/:actionId - Get action status
 */
@Controller('instances')
@UseGuards(JwtAuthGuard)
export class InstanceController {
  constructor(private readonly instanceService: InstanceService) {}

  /**
   * List user's VPS instances
   * 
   * GET /api/v1/instances?page=1&limit=10
   * 
   * Query:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * 
   * Response 200:
   * {
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "orderId": "uuid",
   *       "hostname": "vps-xxx",
   *       "ipAddress": "x.x.x.x",
   *       "status": "active",
   *       "plan": { "name": "Basic 1GB", "cpu": 1, "ram": 1024, "ssd": 25 },
   *       "image": { "name": "Ubuntu 22.04", "distribution": "ubuntu" },
   *       "region": "sgp1",
   *       "createdAt": "ISO date"
   *     }
   *   ],
   *   "meta": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }
   * }
   */
  @Get()
  async getInstances(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<InstanceResponseDto>> {
    return this.instanceService.getInstancesByUserId(userId, query);
  }

  /**
   * Get instance detail with real-time status
   * 
   * GET /api/v1/instances/:id
   * 
   * Response 200:
   * {
   *   "data": {
   *     "id": "uuid",
   *     "orderId": "uuid",
   *     "hostname": "vps-xxx",
   *     "ipAddress": "x.x.x.x",
   *     "ipAddressPrivate": "10.x.x.x",
   *     "status": "active",
   *     "plan": { ... },
   *     "image": { ... },
   *     "region": "sgp1",
   *     "vcpus": 1,
   *     "memory": 1024,
   *     "disk": 25,
   *     "doDropletId": "12345678",
   *     "createdAt": "ISO date"
   *   }
   * }
   * 
   * Errors:
   * - 404: Instance not found
   * - 403: Access denied (not owner)
   */
  @Get(':id')
  async getInstance(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string
  ): Promise<{ data: InstanceDetailResponseDto }> {
    const instance = await this.instanceService.getInstanceById(
      instanceId,
      userId
    );

    return { data: instance };
  }

  /**
   * Trigger an action on an instance
   * 
   * POST /api/v1/instances/:id/actions
   * 
   * Body:
   * {
   *   "type": "reboot" | "power_off" | "power_on" | "reset_password"
   * }
   * 
   * Response 202:
   * {
   *   "data": {
   *     "id": 12345678,
   *     "type": "reboot",
   *     "status": "in-progress",
   *     "startedAt": "ISO date",
   *     "completedAt": null
   *   }
   * }
   * 
   * Errors:
   * - 400: Invalid action type or action not allowed for current status
   * - 403: Access denied
   * - 404: Instance not found
   * - 429: Rate limit exceeded (max 1 action per minute per instance)
   * - 503: DigitalOcean API unavailable
   */
  @Post(':id/actions')
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerAction(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string,
    @Body() dto: TriggerActionDto
  ): Promise<{ data: ActionResponseDto }> {
    const action = await this.instanceService.triggerAction(
      instanceId,
      userId,
      dto.type
    );

    return { data: action };
  }

  /**
   * Get action status
   * 
   * GET /api/v1/instances/:id/actions/:actionId
   * 
   * Response 200:
   * {
   *   "data": {
   *     "id": 12345678,
   *     "type": "reboot",
   *     "status": "completed",
   *     "startedAt": "ISO date",
   *     "completedAt": "ISO date"
   *   }
   * }
   * 
   * Errors:
   * - 403: Access denied
   * - 404: Instance or action not found
   */
  @Get(':id/actions/:actionId')
  async getActionStatus(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) instanceId: string,
    @Param('actionId', ParseIntPipe) actionId: number
  ): Promise<{ data: ActionResponseDto }> {
    const action = await this.instanceService.getActionStatus(
      instanceId,
      actionId,
      userId
    );

    return { data: action };
  }
}
