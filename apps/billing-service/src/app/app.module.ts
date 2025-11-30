import * as path from 'path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { InvoiceModule } from '../modules/invoice/invoice.module';
import { OrderClientModule } from '../modules/order-client/order-client.module';
import { PromoModule } from '../modules/promo/promo.module';
import { TripayModule } from '../modules/tripay/tripay.module';
import { WalletModule } from '../modules/wallet/wallet.module';
import { WebhookModule } from '../modules/webhook/webhook.module';
import { PrismaModule } from '../prisma/prisma.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    PrismaModule,
    TripayModule,
    InvoiceModule,
    OrderClientModule,
    WalletModule,
    WebhookModule,
    PromoModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
