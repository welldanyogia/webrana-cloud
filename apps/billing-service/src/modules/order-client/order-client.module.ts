import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { OrderClientService } from './order-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'ORDER_SERVICE_URL',
          'http://localhost:3003'
        ),
        timeout: configService.get<number>('ORDER_SERVICE_TIMEOUT_MS', 5000),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  providers: [OrderClientService],
  exports: [OrderClientService],
})
export class OrderClientModule {}
