import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstanceProxyController } from './instance-proxy.controller';

@Module({
  imports: [ConfigModule],
  controllers: [InstanceProxyController],
})
export class InstanceProxyModule {}
