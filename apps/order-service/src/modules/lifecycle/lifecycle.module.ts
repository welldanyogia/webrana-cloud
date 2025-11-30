import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { DistributedLockService } from '../../common/services/distributed-lock.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { BillingClientModule } from '../billing-client/billing-client.module';
import { DoAccountModule } from '../do-account/do-account.module';
import { NotificationClientModule } from '../notification-client/notification-client.module';

import { LifecycleScheduler } from './lifecycle.scheduler';
import { LifecycleService } from './lifecycle.service';

/**
 * Lifecycle Module
 *
 * Provides VPS lifecycle management functionality:
 * - Expiration notifications
 * - Auto-renewals
 * - Suspension and termination
 * - Distributed locking for cron jobs
 *
 * Dependencies:
 * - PrismaModule: Database access
 * - DoAccountModule: DigitalOcean API access for droplet operations
 * - BillingClientModule: Balance operations for renewals
 * - NotificationClientModule: Sending lifecycle notifications to users
 * - ScheduleModule: NestJS cron job scheduling
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    DoAccountModule,
    BillingClientModule,
    NotificationClientModule,
  ],
  providers: [
    LifecycleService,
    LifecycleScheduler,
    DistributedLockService,
  ],
  exports: [LifecycleService, DistributedLockService],
})
export class LifecycleModule {}
