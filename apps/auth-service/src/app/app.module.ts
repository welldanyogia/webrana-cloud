import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from '../common/filters/throttler-exception.filter';
import { ThrottlerRedisStorage } from '../common/throttler/throttler-redis-storage';
import { CustomThrottlerGuard } from '../common/guards/custom-throttler.guard';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('AUTH_RATE_LIMIT_WINDOW', 60) * 1000, // Convert to ms
            limit: config.get<number>('AUTH_RATE_LIMIT_LOGIN', 5),
          },
        ],
        storage: new ThrottlerRedisStorage(
          config.get<string>('REDIS_URL', 'redis://localhost:6379')
        ),
      }),
    }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ThrottlerExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule { }
