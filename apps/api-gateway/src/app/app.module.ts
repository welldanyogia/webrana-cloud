import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';


import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ThrottleExceptionFilter } from '../common/filters/throttle-exception.filter';
import { RateLimitHeaderInterceptor } from '../common/interceptors/rate-limit-header.interceptor';
import { AuthProxyModule } from '../modules/auth-proxy/auth-proxy.module';
import { BillingProxyModule } from '../modules/billing-proxy/billing-proxy.module';
import { CatalogProxyModule } from '../modules/catalog-proxy/catalog-proxy.module';
import { InstanceProxyModule } from '../modules/instance-proxy/instance-proxy.module';
import { NotificationProxyModule } from '../modules/notification-proxy/notification-proxy.module';
import { OrderProxyModule } from '../modules/order-proxy/order-proxy.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    /**
     * ThrottlerModule Configuration
     * 
     * Multiple rate limiting tiers:
     * - short: 3 requests per second (burst protection)
     * - medium: 20 requests per 10 seconds (moderate protection)
     * - long: 100 requests per minute (general limit)
     * 
     * Custom guards override these defaults for specific endpoints.
     */
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: configService.get<number>('THROTTLE_SHORT_TTL', 1000),
            limit: configService.get<number>('THROTTLE_SHORT_LIMIT', 3),
          },
          {
            name: 'medium',
            ttl: configService.get<number>('THROTTLE_MEDIUM_TTL', 10000),
            limit: configService.get<number>('THROTTLE_MEDIUM_LIMIT', 20),
          },
          {
            name: 'long',
            ttl: configService.get<number>('THROTTLE_LONG_TTL', 60000),
            limit: configService.get<number>('THROTTLE_LONG_LIMIT', 100),
          },
        ],
      }),
    }),
    AuthProxyModule,
    BillingProxyModule,
    CatalogProxyModule,
    InstanceProxyModule,
    NotificationProxyModule,
    OrderProxyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeaderInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottleExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
