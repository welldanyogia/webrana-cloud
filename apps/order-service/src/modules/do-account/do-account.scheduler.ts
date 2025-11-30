import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DoAccountService } from './do-account.service';

/**
 * Scheduler for DO Account operations
 *
 * Handles periodic tasks:
 * - Sync all account limits every 5 minutes
 * - Health check all accounts every minute
 * - Capacity alerts every 10 minutes
 */
@Injectable()
export class DoAccountScheduler {
  private readonly logger = new Logger(DoAccountScheduler.name);

  constructor(private readonly doAccountService: DoAccountService) {}

  /**
   * Sync all DO accounts' limits every 5 minutes
   * Updates dropletLimit and activeDroplets from DO API
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncAllAccountLimits(): Promise<void> {
    this.logger.log('Starting scheduled sync for all DO accounts');

    try {
      await this.doAccountService.syncAllAccounts();
      this.logger.log('Completed scheduled sync for all DO accounts');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to sync DO accounts', errorMessage);
    }
  }

  /**
   * Health check all accounts every minute
   * Marks unhealthy accounts and sends alerts
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async healthCheckAllAccounts(): Promise<void> {
    this.logger.debug('Starting health check for all DO accounts');

    try {
      const accounts = await this.doAccountService.findAll();

      for (const account of accounts) {
        if (!account.isActive) continue;

        try {
          await this.doAccountService.healthCheck(account.id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Health check failed for account ${account.id}: ${errorMessage}`
          );
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to run health checks', errorMessage);
    }
  }

  /**
   * Check capacity and send alerts every 10 minutes
   * Alerts when total capacity > 80% or any account is full
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkCapacityAlerts(): Promise<void> {
    this.logger.debug('Checking DO account capacity for alerts');

    try {
      const stats = await this.doAccountService.getOverallStats();

      const utilizationPercent =
        stats.totalDropletLimit > 0
          ? (stats.totalActiveDroplets / stats.totalDropletLimit) * 100
          : 0;

      if (utilizationPercent >= 90) {
        this.logger.error(
          `CRITICAL: DO account capacity at ${utilizationPercent.toFixed(1)}%`
        );
        // TODO: Send notification via notification-service
        await this.sendCapacityAlert('critical', utilizationPercent);
      } else if (utilizationPercent >= 80) {
        this.logger.warn(
          `WARNING: DO account capacity at ${utilizationPercent.toFixed(1)}%`
        );
        await this.sendCapacityAlert('warning', utilizationPercent);
      }

      // Check for full accounts
      if (stats.fullAccounts > 0) {
        this.logger.warn(
          `${stats.fullAccounts} DO account(s) are at full capacity`
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.stack : String(error);
      this.logger.error('Failed to check capacity alerts', errorMessage);
    }
  }

  /**
   * Send capacity alert notification
   * TODO: Integrate with notification-service
   *
   * @param level - Alert level (warning or critical)
   * @param percent - Current utilization percentage
   */
  private async sendCapacityAlert(
    level: 'warning' | 'critical',
    percent: number
  ): Promise<void> {
    // TODO: Integrate with notification-service
    // For now, just log
    this.logger.log(
      `[${level.toUpperCase()}] DO capacity alert: ${percent.toFixed(1)}%`
    );
  }
}
