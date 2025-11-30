import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InAppNotification, NotificationEvent } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import {
  ListNotificationsQueryDto,
  CreateInAppNotificationDto,
  InAppNotificationResponseDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './dto';

@Injectable()
export class UserNotificationService {
  private readonly logger = new Logger(UserNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new in-app notification
   */
  async create(dto: CreateInAppNotificationDto): Promise<InAppNotification> {
    this.logger.log(`Creating in-app notification for user: ${dto.userId}`);

    const notification = await this.prisma.inAppNotification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        message: dto.message,
        type: dto.type as NotificationEvent,
        actionUrl: dto.actionUrl,
        metadata: dto.metadata,
      },
    });

    this.logger.log(`Created in-app notification: ${notification.id}`);
    return notification;
  }

  /**
   * Get paginated list of notifications for a user
   */
  async getNotifications(
    userId: string,
    query: ListNotificationsQueryDto
  ): Promise<NotificationListResponseDto> {
    const { page = 1, limit = 20, isRead } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inAppNotification.count({ where }),
    ]);

    return {
      data: notifications.map((n) => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const count = await this.prisma.inAppNotification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    userId: string,
    notificationId: string
  ): Promise<InAppNotification> {
    const notification = await this.prisma.inAppNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notifikasi tidak ditemukan',
      });
    }

    if (notification.isRead) {
      return notification;
    }

    return this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user: ${userId}`);
    return { count: result.count };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    userId: string,
    notificationId: string
  ): Promise<void> {
    const notification = await this.prisma.inAppNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notifikasi tidak ditemukan',
      });
    }

    await this.prisma.inAppNotification.delete({
      where: { id: notificationId },
    });

    this.logger.log(`Deleted notification: ${notificationId}`);
  }

  /**
   * Get a single notification by ID
   */
  async getById(
    userId: string,
    notificationId: string
  ): Promise<InAppNotification | null> {
    return this.prisma.inAppNotification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  /**
   * Convert InAppNotification to response DTO
   */
  private toResponseDto(notification: InAppNotification): InAppNotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      actionUrl: notification.actionUrl ?? undefined,
      metadata: notification.metadata as Record<string, any> | undefined,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
