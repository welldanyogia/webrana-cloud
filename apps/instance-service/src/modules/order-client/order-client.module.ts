import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { OrderClientService } from './order-client.service';

@Module({
  imports: [ConfigModule],
  providers: [OrderClientService],
  exports: [OrderClientService],
})
export class OrderClientModule {}
