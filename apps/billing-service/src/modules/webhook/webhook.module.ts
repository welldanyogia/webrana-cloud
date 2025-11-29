import { Module } from '@nestjs/common';

import { InvoiceModule } from '../invoice/invoice.module';
import { TripayModule } from '../tripay/tripay.module';

import { WebhookController } from './webhook.controller';

@Module({
  imports: [InvoiceModule, TripayModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
