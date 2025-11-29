import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import {
  SendNotificationDto,
  ListNotificationLogsDto,
  SendNotificationResponseDto,
  NotificationLogListResponseDto,
} from './dto/notification.dto';
import { NotificationService } from './notification.service';

/**
 * Internal Notification Controller
 * 
 * Endpoints protected by API key for internal service communication.
 * 
 * Usage:
 * - Order service calls POST /internal/notifications/send after order creation
 * - Billing service calls POST /internal/notifications/send after payment confirmation
 */
@Controller('internal/notifications')
@UseGuards(ApiKeyGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Send a notification
   * 
   * @param dto - Notification request with event, userId, and data
   * @returns Notification result with status per channel
   * 
   * @example
   * POST /api/v1/internal/notifications/send
   * Headers: { X-API-Key: "your-api-key" }
   * Body: {
   *   "event": "ORDER_CREATED",
   *   "userId": "user-uuid",
   *   "data": {
   *     "orderNumber": "ORD-001",
   *     "planName": "VPS Basic",
   *     "duration": 1,
   *     "durationUnit": "month",
   *     "basePrice": 150000,
   *     "finalPrice": 150000
   *   }
   * }
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendNotification(
    @Body() dto: SendNotificationDto
  ): Promise<{ data: SendNotificationResponseDto }> {
    this.logger.log(
      `Received notification request: event=${dto.event}, userId=${dto.userId}`
    );

    const result = await this.notificationService.notify(
      dto.event,
      dto.userId,
      dto.data
    );

    return { data: result };
  }

  /**
   * Get notification logs
   * 
   * @param query - Pagination and filter options
   * @returns List of notification logs
   * 
   * @example
   * GET /api/v1/internal/notifications/logs?page=1&limit=20&status=SENT
   * Headers: { X-API-Key: "your-api-key" }
   */
  @Get('logs')
  async getNotificationLogs(
    @Query() query: ListNotificationLogsDto
  ): Promise<NotificationLogListResponseDto> {
    this.logger.log(`Fetching notification logs: ${JSON.stringify(query)}`);

    return this.notificationService.getNotificationLogs(query);
  }

  /**
   * Get available notification templates
   * 
   * @returns List of available notification events and their supported channels
   * 
   * @example
   * GET /api/v1/internal/notifications/templates
   * Headers: { X-API-Key: "your-api-key" }
   */
  @Get('templates')
  getTemplates(): {
    data: {
      event: string;
      channels: string[];
      description: string;
    }[];
  } {
    return {
      data: [
        {
          event: 'ORDER_CREATED',
          channels: ['EMAIL'],
          description: 'Sent when a new order is created',
        },
        {
          event: 'PAYMENT_CONFIRMED',
          channels: ['EMAIL', 'TELEGRAM'],
          description: 'Sent when payment is confirmed',
        },
        {
          event: 'VPS_ACTIVE',
          channels: ['EMAIL', 'TELEGRAM'],
          description: 'Sent when VPS is provisioned and ready',
        },
        {
          event: 'PROVISIONING_FAILED',
          channels: ['EMAIL', 'TELEGRAM'],
          description: 'Sent when VPS provisioning fails',
        },
      ],
    };
  }
}
