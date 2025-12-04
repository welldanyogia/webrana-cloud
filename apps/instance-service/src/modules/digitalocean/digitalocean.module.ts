import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DigitalOceanService } from './digitalocean.service';

@Module({
  imports: [ConfigModule],
  providers: [DigitalOceanService],
  exports: [DigitalOceanService],
})
export class DigitalOceanModule {}
