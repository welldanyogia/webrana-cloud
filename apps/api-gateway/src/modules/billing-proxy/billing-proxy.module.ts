import { Module } from '@nestjs/common';

import { BillingProxyController } from './billing-proxy.controller';

@Module({
  controllers: [BillingProxyController],
})
export class BillingProxyModule {}
