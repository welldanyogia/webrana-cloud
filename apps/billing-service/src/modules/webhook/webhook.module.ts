import { Module } from '@nestjs/common';

import { InvoiceModule } from '../invoice/invoice.module';
import { TripayModule } from '../tripay/tripay.module';
import { WalletModule } from '../wallet/wallet.module';

import { WebhookController } from './webhook.controller';

@Module({
  imports: [InvoiceModule, TripayModule, WalletModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
