import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DistributedLockService } from '../../common/services/distributed-lock.service';

import { LifecycleService } from './lifecycle.service';

/**
 * VPS Lifecycle Scheduler
 *
 * Orchestrates the periodic processing of VPS lifecycle events:
 * - Expiration notifications
 * - Auto-renewals
 * - Expired VPS processing (suspend/terminate)
 * - Suspended VPS termination after grace period
 *
 * All cron jobs use distributed locks to ensure only one instance
 * runs at a time in a multi-replica deployment.
 *
 * Cron Schedule:
 * - Expiring VPS: Every 30 minutes
 * - Auto-renewals: Every hour
 * - Expired VPS: Every 15 minutes
 * - Suspended VPS: Every 15 minutes
 * - Lock cleanup: Daily at 3 AM
 */
@Injectable()
export class LifecycleScheduler {
  private readonly logger = new Logger(LifecycleScheduler.name);

  constructor(
    private readonly lifecycleService: LifecycleService,
    private readonly lockService: DistributedLockService
  ) {}

  /**
   * Process expiring VPS every 30 minutes
   *
   * Sends notifications to users about VPS approaching expiration
   * based on configurable thresholds (7d, 3d, 1d, 8h).
   *
   * Lock TTL: 1800 seconds (30 minutes)
   */
  @Cron('*/30 * * * *')
  async processExpiring(): Promise<void> {
    const result = await this.lockService.withLock(
      'lifecycle-expiring',
      1800, // 30 minutes
      async () => {
        this.logger.log('Starting expiring VPS processing...');
        const stats = await this.lifecycleService.processExpiringVps();
        this.logger.log(
          `Expiring VPS processing complete: ${JSON.stringify(stats)}`
        );
        return stats;
      }
    );

    if (result === null) {
      this.logger.debug(
        'Skipping expiring VPS processing: another instance holds the lock'
      );
    }
  }

  /**
   * Process auto-renewals every hour
   *
   * Attempts to renew VPS orders with autoRenew enabled that are
   * expiring within 24 hours. Deducts from user's balance.
   *
   * Lock TTL: 3600 seconds (1 hour)
   */
  @Cron('0 * * * *')
  async processRenewals(): Promise<void> {
    const result = await this.lockService.withLock(
      'lifecycle-renewals',
      3600, // 1 hour
      async () => {
        this.logger.log('Starting auto-renewals processing...');
        const stats = await this.lifecycleService.processAutoRenewals();
        this.logger.log(
          `Auto-renewals processing complete: ${JSON.stringify(stats)}`
        );
        return stats;
      }
    );

    if (result === null) {
      this.logger.debug(
        'Skipping auto-renewals processing: another instance holds the lock'
      );
    }
  }

  /**
   * Process expired VPS every 15 minutes
   *
   * Handles VPS that have passed their expiration date:
   * - Daily: Terminate immediately
   * - Monthly/Yearly: Suspend (power off) and enter grace period
   *
   * Lock TTL: 900 seconds (15 minutes)
   */
  @Cron('*/15 * * * *')
  async processExpired(): Promise<void> {
    const result = await this.lockService.withLock(
      'lifecycle-expired',
      900, // 15 minutes
      async () => {
        this.logger.log('Starting expired VPS processing...');
        const stats = await this.lifecycleService.processExpiredVps();
        this.logger.log(
          `Expired VPS processing complete: ${JSON.stringify(stats)}`
        );
        return stats;
      }
    );

    if (result === null) {
      this.logger.debug(
        'Skipping expired VPS processing: another instance holds the lock'
      );
    }
  }

  /**
   * Process suspended VPS every 15 minutes
   *
   * Terminates VPS that have been suspended past their grace period:
   * - Monthly: 24 hours after suspension
   * - Yearly: 72 hours after suspension
   *
   * Lock TTL: 900 seconds (15 minutes)
   */
  @Cron('*/15 * * * *')
  async processSuspended(): Promise<void> {
    const result = await this.lockService.withLock(
      'lifecycle-suspended',
      900, // 15 minutes
      async () => {
        this.logger.log('Starting suspended VPS processing...');
        const stats = await this.lifecycleService.processSuspendedVps();
        this.logger.log(
          `Suspended VPS processing complete: ${JSON.stringify(stats)}`
        );
        return stats;
      }
    );

    if (result === null) {
      this.logger.debug(
        'Skipping suspended VPS processing: another instance holds the lock'
      );
    }
  }

  /**
   * Clean up expired locks daily at 3 AM
   *
   * Removes stale lock records from the database. This is purely
   * for database hygiene - expired locks are already ignored.
   *
   * Lock TTL: 300 seconds (5 minutes)
   */
  @Cron('0 3 * * *')
  async cleanupLocks(): Promise<void> {
    const result = await this.lockService.withLock(
      'lifecycle-cleanup',
      300, // 5 minutes
      async () => {
        this.logger.log('Starting expired lock cleanup...');
        const count = await this.lockService.cleanupExpiredLocks();
        this.logger.log(`Cleaned up ${count} expired locks`);
        return count;
      }
    );

    if (result === null) {
      this.logger.debug(
        'Skipping lock cleanup: another instance holds the lock'
      );
    }
  }

  /**
   * Get the status of all lifecycle jobs
   * (Can be used for health check endpoints)
   */
  async getJobsStatus(): Promise<{
    expiring: { locked: boolean; info: unknown };
    renewals: { locked: boolean; info: unknown };
    expired: { locked: boolean; info: unknown };
    suspended: { locked: boolean; info: unknown };
  }> {
    const [expiringLock, renewalsLock, expiredLock, suspendedLock] =
      await Promise.all([
        this.lockService.getLockInfo('lifecycle-expiring'),
        this.lockService.getLockInfo('lifecycle-renewals'),
        this.lockService.getLockInfo('lifecycle-expired'),
        this.lockService.getLockInfo('lifecycle-suspended'),
      ]);

    return {
      expiring: {
        locked: expiringLock !== null && expiringLock.expiresAt > new Date(),
        info: expiringLock,
      },
      renewals: {
        locked: renewalsLock !== null && renewalsLock.expiresAt > new Date(),
        info: renewalsLock,
      },
      expired: {
        locked: expiredLock !== null && expiredLock.expiresAt > new Date(),
        info: expiredLock,
      },
      suspended: {
        locked: suspendedLock !== null && suspendedLock.expiresAt > new Date(),
        info: suspendedLock,
      },
    };
  }
}
