import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogClientModule } from '../modules/catalog-client/catalog-client.module';
import { BillingClientModule } from '../modules/billing-client/billing-client.module';
import { OrderModule } from '../modules/order/order.module';
import { ProvisioningModule } from '../modules/provisioning/provisioning.module';
import { DoAccountModule } from '../modules/do-account/do-account.module';
import { LifecycleModule } from '../modules/lifecycle/lifecycle.module';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.join(__dirname, '..', '..', '.env'),
    }),
    PrismaModule,
    CatalogClientModule,
    BillingClientModule,
    OrderModule,
    ProvisioningModule,
    DoAccountModule,
    LifecycleModule,
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
