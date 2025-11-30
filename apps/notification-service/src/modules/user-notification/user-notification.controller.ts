import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  ListNotificationsQueryDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
  NotificationActionResponseDto,
  InAppNotificationResponseDto,
} from './dto';
import { UserNotificationService } from './user-notification.service';

/**
 * User-facing API endpoints for in-app notifications
 * 
 * All endpoints are protected by JWT authentication.
 * Users can only access their own notifications.
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class UserNotificationController {
  private readonly logger = new Logger(UserNotificationController.name);

  constructor(private readonly userNotificationService: UserNotificationService) {}

  /**
   * GET /api/v1/notifications
   * List notifications for the current user (paginated)
   */
  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListNotificationsQueryDto
  ): Promise<NotificationListResponseDto> {
    this.logger.log(`User ${user.userId} fetching notifications`);
    return this.userNotificationService.getNotifications(user.userId, query);
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get the count of unread notifications for the current user
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser() user: CurrentUserPayload
  ): Promise<UnreadCountResponseDto> {
    return this.userNotificationService.getUnreadCount(user.userId);
  }

  /**
   * POST /api/v1/notifications/:id/read
   * Mark a single notification as read
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') notificationId: string
  ): Promise<NotificationActionResponseDto> {
    this.logger.log(`User ${user.userId} marking notification ${notificationId} as read`);
    await this.userNotificationService.markAsRead(user.userId, notificationId);
    return {
      success: true,
      message: 'Notifikasi berhasil ditandai sudah dibaca',
    };
  }

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read for the current user
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @CurrentUser() user: CurrentUserPayload
  ): Promise<NotificationActionResponseDto & { count: number }> {
    this.logger.log(`User ${user.userId} marking all notifications as read`);
    const result = await this.userNotificationService.markAllAsRead(user.userId);
    return {
      success: true,
      message: `${result.count} notifikasi berhasil ditandai sudah dibaca`,
      count: result.count,
    };
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteNotification(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') notificationId: string
  ): Promise<NotificationActionResponseDto> {
    this.logger.log(`User ${user.userId} deleting notification ${notificationId}`);
    await this.userNotificationService.deleteNotification(user.userId, notificationId);
    return {
      success: true,
      message: 'Notifikasi berhasil dihapus',
    };
  }
}
