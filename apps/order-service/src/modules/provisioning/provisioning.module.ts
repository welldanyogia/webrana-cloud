import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProvisioningService } from './provisioning.service';
import { DigitalOceanClientService } from './digitalocean-client.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [ProvisioningService, DigitalOceanClientService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
