import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DigitalOceanModule } from '../digitalocean/digitalocean.module';
import { OrderClientModule } from '../order-client/order-client.module';

import { InstanceController } from './instance.controller';
import { InstanceService } from './instance.service';

@Module({
  imports: [ConfigModule, DigitalOceanModule, OrderClientModule],
  controllers: [InstanceController],
  providers: [InstanceService],
  exports: [InstanceService],
})
export class InstanceModule {}
