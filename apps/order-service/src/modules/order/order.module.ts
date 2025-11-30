import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderController } from './order.controller';
import { InternalOrderController } from './internal-order.controller';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';
import { CatalogClientModule } from '../catalog-client/catalog-client.module';
import { BillingClientModule } from '../billing-client/billing-client.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { DoAccountModule } from '../do-account/do-account.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, 
    ConfigModule, 
    CatalogClientModule, 
    BillingClientModule,
    ProvisioningModule,
    DoAccountModule,
  ],
  controllers: [OrderController, InternalOrderController],
  providers: [OrderService, PaymentService],
  exports: [OrderService, PaymentService],
})
export class OrderModule {}
