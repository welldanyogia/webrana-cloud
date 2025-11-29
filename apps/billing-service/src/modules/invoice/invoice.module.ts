import { Module } from '@nestjs/common';

import { OrderClientModule } from '../order-client/order-client.module';
import { TripayModule } from '../tripay/tripay.module';

import { AdminInvoiceController } from './admin-invoice.controller';
import { InternalInvoiceController } from './internal-invoice.controller';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PaymentChannelController } from './payment-channel.controller';

@Module({
  imports: [TripayModule, OrderClientModule],
  controllers: [
    InvoiceController,
    PaymentChannelController,
    AdminInvoiceController,
    InternalInvoiceController,
  ],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
