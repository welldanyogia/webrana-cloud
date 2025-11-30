import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';

import { NotificationClient, NotificationPayload } from '../lifecycle/lifecycle.service';

/**
 * NotificationClientService
 *
 * Service to communicate with notification-service for sending VPS lifecycle notifications.
 * Used by order-service's LifecycleService to:
 * - Notify users about expiring VPS
 * - Notify users about suspended VPS
 * - Notify users about destroyed VPS
 * - Notify users about renewal success/failure
 *
 * Important: This service uses fire-and-forget pattern - notification failures
 * do NOT fail the main lifecycle operations. This ensures VPS management
 * continues even if notification-service is unavailable.
 */
@Injectable()
export class NotificationClientService implements NotificationClient {
  private readonly logger = new Logger(NotificationClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get internal API key for service-to-service communication
   */
  private getApiKey(): string {
    return this.configService.get<string>('INTERNAL_API_KEY', '');
  }

  /**
   * Get default headers for internal API calls
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.getApiKey(),
    };
  }

  /**
   * Send a notification to the notification service
   *
   * This method is fire-and-forget - failures are logged but don't throw.
   * This ensures VPS lifecycle operations continue even if notifications fail.
   *
   * @param payload - The notification payload containing event, userId, and data
   */
  async send(payload: NotificationPayload): Promise<void> {
    this.logger.log(
      `Sending notification: event=${payload.event} to user ${payload.userId}`
    );

    try {
      await firstValueFrom(
        this.httpService.post(
          '/internal/notifications/send',
          {
            event: payload.event,
            userId: payload.userId,
            data: payload.data,
          },
          { headers: this.getHeaders() }
        ).pipe(
          catchError((error) => {
            this.logger.warn(
              `Notification service error for ${payload.event}: ${error.message}`
            );
            throw error;
          })
        )
      );

      this.logger.log(
        `Successfully sent ${payload.event} notification to user ${payload.userId}`
      );
    } catch (error) {
      // Fire-and-forget - log error but don't throw
      // This ensures VPS lifecycle operations continue even if notifications fail
      this.logger.warn(
        `Failed to send ${payload.event} notification to user ${payload.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Intentionally NOT re-throwing the error
    }
  }
}
