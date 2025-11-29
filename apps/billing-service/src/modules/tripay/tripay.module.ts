import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TripayService } from './tripay.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mode = configService.get<string>('TRIPAY_MODE', 'sandbox');
        const baseURL =
          mode === 'production'
            ? 'https://tripay.co.id/api'
            : 'https://tripay.co.id/api-sandbox';

        return {
          baseURL,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        };
      },
    }),
  ],
  providers: [TripayService],
  exports: [TripayService],
})
export class TripayModule {}
