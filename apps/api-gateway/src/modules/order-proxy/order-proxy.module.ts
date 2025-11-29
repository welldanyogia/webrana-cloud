import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderProxyController } from './order-proxy.controller';

@Module({
  imports: [ConfigModule],
  controllers: [OrderProxyController],
})
export class OrderProxyModule {}
