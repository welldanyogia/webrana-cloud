import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InAppNotification } from '@prisma/client';

import { NotificationGateway } from './websocket.gateway';

/**
 * Service for managing WebSocket notifications
 * 
 * Provides an abstraction layer for pushing notifications to connected clients.
 * Used by NotificationService to send real-time updates.
 */
@Injectable()
export class WebsocketService {
  private readonly logger = new Logger(WebsocketService.name);

  constructor(
    @Inject(forwardRef(() => NotificationGateway))
    private readonly gateway: NotificationGateway
  ) {}

  /**
   * Push a new notification to a user via WebSocket
   */
  async pushNotification(
    userId: string,
    notification: InAppNotification
  ): Promise<boolean> {
    try {
      if (!this.gateway.isUserConnected(userId)) {
        this.logger.debug(`User ${userId} is not connected, skipping push`);
        return false;
      }

      await this.gateway.pushToUser(userId, this.formatNotification(notification));
      this.logger.log(`Pushed notification ${notification.id} to user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to push notification to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Update the unread count for a user via WebSocket
   */
  async updateUnreadCount(userId: string, count: number): Promise<boolean> {
    try {
      if (!this.gateway.isUserConnected(userId)) {
        this.logger.debug(`User ${userId} is not connected, skipping unread count update`);
        return false;
      }

      await this.gateway.updateUnreadCount(userId, count);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to update unread count for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    return this.gateway.isUserConnected(userId);
  }

  /**
   * Get the number of active connections for a user
   */
  getConnectionCount(userId: string): number {
    return this.gateway.getUserSocketCount(userId);
  }

  /**
   * Format notification for WebSocket transmission
   */
  private formatNotification(notification: InAppNotification): any {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      actionUrl: notification.actionUrl,
      metadata: notification.metadata,
      isRead: notification.isRead,
      readAt: notification.readAt?.toISOString(),
      createdAt: notification.createdAt.toISOString(),
    };
  }
}
