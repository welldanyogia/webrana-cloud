import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { DoAccountModule } from '../do-account/do-account.module';
import { ProvisioningService } from './provisioning.service';
import { DigitalOceanClientService } from './digitalocean-client.service';

@Module({
  imports: [PrismaModule, ConfigModule, DoAccountModule],
  providers: [ProvisioningService, DigitalOceanClientService],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
