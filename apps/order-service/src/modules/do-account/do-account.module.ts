import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DoAccountController } from './do-account.controller';
import { DoAccountService } from './do-account.service';
import { DoAccountScheduler } from './do-account.scheduler';
import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [DoAccountController],
  providers: [DoAccountService, DoAccountScheduler, EncryptionService],
  exports: [DoAccountService, EncryptionService],
})
export class DoAccountModule {}
