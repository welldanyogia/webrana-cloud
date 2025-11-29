import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatalogClientService } from './catalog-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'CATALOG_SERVICE_URL',
          'http://localhost:3002'
        ),
        timeout: configService.get<number>('CATALOG_SERVICE_TIMEOUT_MS', 5000),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  providers: [CatalogClientService],
  exports: [CatalogClientService],
})
export class CatalogClientModule {}
