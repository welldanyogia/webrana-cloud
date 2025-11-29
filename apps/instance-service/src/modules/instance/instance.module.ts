import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstanceController } from './instance.controller';
import { InstanceService } from './instance.service';
import { DigitalOceanModule } from '../digitalocean/digitalocean.module';
import { OrderClientModule } from '../order-client/order-client.module';

@Module({
  imports: [ConfigModule, DigitalOceanModule, OrderClientModule],
  controllers: [InstanceController],
  providers: [InstanceService],
  exports: [InstanceService],
})
export class InstanceModule {}
