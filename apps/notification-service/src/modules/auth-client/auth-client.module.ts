import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthClientService } from './auth-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'AUTH_SERVICE_URL',
          'http://localhost:3001'
        ),
        timeout: configService.get<number>('AUTH_SERVICE_TIMEOUT_MS', 5000),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  providers: [AuthClientService],
  exports: [AuthClientService],
})
export class AuthClientModule {}
