import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { NotificationClientService } from './notification-client.service';

/**
 * NotificationClientModule
 *
 * Provides NotificationClientService for sending VPS lifecycle notifications
 * to the notification-service.
 *
 * Configuration:
 * - NOTIFICATION_SERVICE_URL: Base URL for notification-service (default: http://localhost:3005)
 * - NOTIFICATION_SERVICE_TIMEOUT_MS: Request timeout in milliseconds (default: 5000)
 * - INTERNAL_API_KEY: API key for internal service communication
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'NOTIFICATION_SERVICE_URL',
          'http://localhost:3005'
        ),
        timeout: configService.get<number>('NOTIFICATION_SERVICE_TIMEOUT_MS', 5000),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
    ConfigModule,
  ],
  providers: [NotificationClientService],
  exports: [NotificationClientService],
})
export class NotificationClientModule {}
