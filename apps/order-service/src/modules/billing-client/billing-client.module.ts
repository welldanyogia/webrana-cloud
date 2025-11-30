import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BillingClientService } from './billing-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'BILLING_SERVICE_URL',
          'http://localhost:3003'
        ),
        timeout: configService.get<number>('BILLING_SERVICE_TIMEOUT_MS', 10000),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
    ConfigModule,
  ],
  providers: [BillingClientService],
  exports: [BillingClientService],
})
export class BillingClientModule {}
