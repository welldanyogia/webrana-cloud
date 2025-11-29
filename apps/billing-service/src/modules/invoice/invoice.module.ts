import { Module } from '@nestjs/common';

import { OrderClientModule } from '../order-client/order-client.module';
import { TripayModule } from '../tripay/tripay.module';

import { InvoiceService } from './invoice.service';

@Module({
  imports: [TripayModule, OrderClientModule],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
