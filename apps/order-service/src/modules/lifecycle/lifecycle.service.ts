import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  Order,
  BillingPeriod,
  OrderStatus,
  TerminationReason,
  RenewalType,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { BillingClientService } from '../billing-client/billing-client.service';
import { DoAccountService } from '../do-account/do-account.service';
import { DoApiClient } from '../do-account/do-api.client';
import { NotificationClientService } from '../notification-client/notification-client.service';

/**
 * Date utility functions
 */
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Notification event types for VPS lifecycle
 */
export type NotificationEvent =
  | 'VPS_EXPIRING_SOON'
  | 'VPS_SUSPENDED'
  | 'VPS_DESTROYED'
  | 'RENEWAL_SUCCESS'
  | 'RENEWAL_FAILED_NO_BALANCE';

/**
 * Notification payload interface
 */
export interface NotificationPayload {
  userId: string;
  event: NotificationEvent;
  data: Record<string, unknown>;
}



/**
 * Notification Client interface
 * This will be implemented by notification-service integration
 */
export interface NotificationClient {
  send(payload: NotificationPayload): Promise<void>;
}

/**
 * Lifecycle processing statistics
 */
export interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ orderId: string; error: string }>;
}

/**
 * VPS Lifecycle Service
 *
 * Handles the complete lifecycle of VPS orders:
 * - Expiration notifications based on configurable thresholds
 * - Auto-renewal with balance checking
 * - Grace period management per billing type
 * - Suspension (power off) for monthly/yearly plans
 * - Termination (destroy) for expired VPS
 *
 * Business Rules:
 * - Daily: No grace period, destroy immediately on expiry
 * - Monthly: 24h grace period, suspend first then destroy
 * - Yearly: 72h grace period, suspend first then destroy
 *
 * All operations are idempotent and safe to retry.
 */
@Injectable()
export class LifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly doAccountService: DoAccountService,
    @Optional() private readonly billingClient?: BillingClientService,
    @Optional() private readonly notificationClient?: NotificationClientService
  ) {}

  // ===========================================
  // Configuration
  // ===========================================

  /**
   * Get grace period in hours based on billing period
   *
   * - DAILY: 0 (no grace, destroy immediately)
   * - MONTHLY: 24 hours (1 day)
   * - YEARLY: 72 hours (3 days)
   */
  getGracePeriodHours(billingPeriod: BillingPeriod): number {
    switch (billingPeriod) {
      case BillingPeriod.DAILY:
        return 0; // No grace, destroy immediately
      case BillingPeriod.MONTHLY:
        return 24; // 1 day
      case BillingPeriod.YEARLY:
        return 72; // 3 days
      default:
        return 24;
    }
  }

  /**
   * Check if billing period uses suspend before destroy
   * Daily plans are destroyed immediately, others are suspended first
   */
  usesSuspend(billingPeriod: BillingPeriod): boolean {
    return billingPeriod !== BillingPeriod.DAILY;
  }

  /**
   * Get notification thresholds (in hours before expiry) per billing period
   */
  getNotificationThresholds(billingPeriod: BillingPeriod): number[] {
    switch (billingPeriod) {
      case BillingPeriod.DAILY:
        return [8]; // 8 hours only for daily
      case BillingPeriod.MONTHLY:
      case BillingPeriod.YEARLY:
        return [7 * 24, 3 * 24, 24, 8]; // 7d, 3d, 1d, 8h
      default:
        return [24, 8];
    }
  }

  // ===========================================
  // Expiring VPS Processing
  // ===========================================

  /**
   * Process expiring VPS - mark as EXPIRING_SOON and send notifications
   *
   * Checks all active orders against notification thresholds and sends
   * appropriate notifications. Each threshold is tracked to avoid
   * duplicate notifications.
   *
   * @returns Processing statistics
   */
  async processExpiringVps(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();

    // Process each billing period
    for (const billingPeriod of Object.values(BillingPeriod)) {
      const thresholds = this.getNotificationThresholds(billingPeriod);

      for (const hoursBeforeExpiry of thresholds) {
        const targetTime = addHours(now, hoursBeforeExpiry);

        try {
          // Find orders expiring within this threshold that haven't been notified
          const orders = await this.prisma.order.findMany({
            where: {
              status: { in: [OrderStatus.ACTIVE, OrderStatus.EXPIRING_SOON] },
              billingPeriod,
              expiresAt: {
                gte: now,
                lte: targetTime,
              },
              // Check that we haven't already notified for this threshold
              NOT: {
                statusHistory: {
                  some: {
                    newStatus: OrderStatus.EXPIRING_SOON,
                    metadata: {
                      path: ['threshold'],
                      equals: hoursBeforeExpiry,
                    },
                  },
                },
              },
            },
            include: {
              statusHistory: true,
            },
          });

          for (const order of orders) {
            stats.processed++;

            try {
              await this.sendExpirationNotification(order, hoursBeforeExpiry);
              stats.succeeded++;
            } catch (error) {
              stats.failed++;
              stats.errors.push({
                orderId: order.id,
                error:
                  error instanceof Error ? error.message : 'Unknown error',
              });
              this.logger.error(
                `Failed to send expiration notification for order ${order.id}`,
                error
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Error processing expiring VPS for ${billingPeriod} at ${hoursBeforeExpiry}h threshold`,
            error
          );
        }
      }
    }

    this.logger.log(
      `Expiring VPS processed: ${stats.succeeded}/${stats.processed} succeeded`
    );

    return stats;
  }

  /**
   * Send expiration notification for an order
   */
  private async sendExpirationNotification(
    order: Order,
    hoursBeforeExpiry: number
  ): Promise<void> {
    // Send notification if client is configured
    if (this.notificationClient) {
      await this.notificationClient.send({
        userId: order.userId,
        event: 'VPS_EXPIRING_SOON',
        data: {
          orderId: order.id,
          planName: order.planName,
          expiresAt: order.expiresAt?.toISOString(),
          hoursRemaining: hoursBeforeExpiry,
          autoRenew: order.autoRenew,
        },
      });
    }

    // Record that we sent this notification (for idempotency)
    await this.prisma.statusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: OrderStatus.EXPIRING_SOON,
        actor: 'system',
        reason: `Expiration warning: ${hoursBeforeExpiry} hours`,
        metadata: { threshold: hoursBeforeExpiry },
      },
    });

    // Update status to EXPIRING_SOON if currently ACTIVE
    // Use optimistic locking to prevent race conditions
    if (order.status === OrderStatus.ACTIVE) {
      await this.prisma.order.updateMany({
        where: {
          id: order.id,
          status: OrderStatus.ACTIVE,
          version: order.version,
        },
        data: {
          status: OrderStatus.EXPIRING_SOON,
          version: { increment: 1 },
        },
      });
    }
  }

  // ===========================================
  // Auto-Renewal Processing
  // ===========================================

  /**
   * Process auto-renewals for expiring orders
   *
   * Finds orders with autoRenew enabled that are expiring within 24 hours
   * and attempts to renew them by deducting from user's balance.
   *
   * @returns Processing statistics
   */
  async processAutoRenewals(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();
    const threshold = addHours(now, 24);

    // Find orders eligible for auto-renewal
    const ordersToRenew = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.EXPIRING_SOON, OrderStatus.EXPIRED] },
        autoRenew: true,
        expiresAt: { lte: threshold },
        renewalFailReason: null, // Don't retry failed renewals immediately
      },
    });

    for (const order of ordersToRenew) {
      stats.processed++;

      try {
        const success = await this.attemptRenewal(order);
        if (success) {
          stats.succeeded++;
        } else {
          stats.failed++;
        }
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(
          `Failed to process renewal for order ${order.id}`,
          error
        );
      }
    }

    this.logger.log(
      `Auto-renewals processed: ${stats.succeeded}/${stats.processed} succeeded`
    );

    return stats;
  }

  /**
   * Attempt to renew a single order
   *
   * @returns true if renewal succeeded, false otherwise
   */
  private async attemptRenewal(order: Order): Promise<boolean> {
    const renewalPrice = order.finalPrice;

    // Skip if no billing client configured
    if (!this.billingClient) {
      this.logger.warn(
        `Skipping renewal for order ${order.id}: no billing client configured`
      );
      return false;
    }

    try {
      // Check if user has sufficient balance
      const hasSufficientBalance = await this.billingClient.checkSufficientBalance(
        order.userId,
        renewalPrice
      );

      if (!hasSufficientBalance) {
        // Mark renewal as failed
        await this.prisma.order.update({
          where: { id: order.id },
          data: { renewalFailReason: 'INSUFFICIENT_BALANCE' },
        });

        // Create renewal history record
        await this.prisma.renewalHistory.create({
          data: {
            orderId: order.id,
            renewalType: RenewalType.AUTO_RENEWAL,
            amount: renewalPrice,
            previousExpiry: order.expiresAt!,
            newExpiry: order.expiresAt!, // No change
            success: false,
            failReason: 'INSUFFICIENT_BALANCE',
          },
        });

        // Send notification
        if (this.notificationClient) {
          await this.notificationClient.send({
            userId: order.userId,
            event: 'RENEWAL_FAILED_NO_BALANCE',
            data: {
              orderId: order.id,
              planName: order.planName,
              required: renewalPrice,
            },
          });
        }

        return false;
      }

      // Deduct balance
      await this.billingClient.deductBalance(
        order.userId,
        renewalPrice,
        'VPS_RENEWAL',
        order.id,
        `VPS Renewal: ${order.planName}`
      );

      // Calculate new expiry
      const newExpiry = this.calculateNewExpiry(order);
      const previousExpiry = order.expiresAt!;

      // Update order with new expiry
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.ACTIVE,
          expiresAt: newExpiry,
          lastRenewalAt: new Date(),
          renewalFailReason: null,
          version: { increment: 1 },
        },
      });

      // Create renewal history record
      await this.prisma.renewalHistory.create({
        data: {
          orderId: order.id,
          renewalType: RenewalType.AUTO_RENEWAL,
          amount: renewalPrice,
          previousExpiry,
          newExpiry,
          success: true,
        },
      });

      // Create status history record
      await this.prisma.statusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: OrderStatus.ACTIVE,
          actor: 'system',
          reason: 'Auto-renewal successful',
          metadata: { previousExpiry, newExpiry, amount: renewalPrice },
        },
      });

      // Send success notification
      if (this.notificationClient) {
        await this.notificationClient.send({
          userId: order.userId,
          event: 'RENEWAL_SUCCESS',
          data: {
            orderId: order.id,
            planName: order.planName,
            newExpiry: newExpiry.toISOString(),
            amount: renewalPrice,
          },
        });
      }

      this.logger.log(
        `Order ${order.id} renewed successfully. New expiry: ${newExpiry.toISOString()}`
      );

      return true;
    } catch (error) {
      this.logger.error(`Renewal failed for order ${order.id}`, error);

      // Mark as failed to prevent immediate retry
      await this.prisma.order.update({
        where: { id: order.id },
        data: { renewalFailReason: 'SYSTEM_ERROR' },
      });

      return false;
    }
  }

  /**
   * Calculate new expiry date based on billing period
   */
  calculateNewExpiry(order: Order): Date {
    // Use current expiry if still in future, otherwise use now
    const baseDate = order.expiresAt && order.expiresAt > new Date()
      ? order.expiresAt
      : new Date();

    switch (order.billingPeriod) {
      case BillingPeriod.DAILY:
        return addDays(baseDate, 1);
      case BillingPeriod.MONTHLY:
        return addMonths(baseDate, 1);
      case BillingPeriod.YEARLY:
        return addYears(baseDate, 1);
      default:
        return addMonths(baseDate, 1);
    }
  }

  // ===========================================
  // Expired VPS Processing
  // ===========================================

  /**
   * Process expired VPS
   *
   * - Daily: Terminate immediately
   * - Monthly/Yearly: Suspend (power off) and enter grace period
   *
   * @returns Processing statistics
   */
  async processExpiredVps(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();

    // Find expired orders (past expiresAt)
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.ACTIVE, OrderStatus.EXPIRING_SOON] },
        expiresAt: { lt: now },
      },
    });

    for (const order of expiredOrders) {
      stats.processed++;

      try {
        if (order.billingPeriod === BillingPeriod.DAILY) {
          // Daily: Terminate immediately
          await this.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL);
        } else {
          // Monthly/Yearly: Suspend first
          await this.suspendVps(order);
        }
        stats.succeeded++;
      } catch (error) {
        stats.failed++;
        stats.errors.push({
          orderId: order.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        this.logger.error(
          `Failed to process expired VPS for order ${order.id}`,
          error
        );
      }
    }

    this.logger.log(
      `Expired VPS processed: ${stats.succeeded}/${stats.processed} succeeded`
    );

    return stats;
  }

  /**
   * Suspend a VPS (power off, enter grace period)
   */
  async suspendVps(order: Order): Promise<void> {
    const now = new Date();

    // Update status atomically using optimistic locking
    const result = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        status: {
          in: [OrderStatus.ACTIVE, OrderStatus.EXPIRING_SOON, OrderStatus.EXPIRED],
        },
        version: order.version,
      },
      data: {
        status: OrderStatus.SUSPENDED,
        suspendedAt: now,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      this.logger.warn(
        `Order ${order.id} was already modified, skipping suspend`
      );
      return;
    }

    // Power off the droplet
    await this.powerOffDroplet(order.id);

    // Create status history
    await this.prisma.statusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: OrderStatus.SUSPENDED,
        actor: 'system',
        reason: 'VPS expired, suspended for grace period',
        metadata: {
          suspendedAt: now.toISOString(),
          gracePeriodHours: this.getGracePeriodHours(order.billingPeriod),
        },
      },
    });

    // Send notification
    if (this.notificationClient) {
      await this.notificationClient.send({
        userId: order.userId,
        event: 'VPS_SUSPENDED',
        data: {
          orderId: order.id,
          planName: order.planName,
          suspendedAt: now.toISOString(),
          gracePeriodHours: this.getGracePeriodHours(order.billingPeriod),
        },
      });
    }

    this.logger.log(
      `VPS suspended for order ${order.id}, grace period: ${this.getGracePeriodHours(order.billingPeriod)} hours`
    );
  }

  /**
   * Power off a droplet via DigitalOcean API
   */
  private async powerOffDroplet(orderId: string): Promise<void> {
    const task = await this.prisma.provisioningTask.findUnique({
      where: { orderId },
    });

    if (!task?.dropletId || !task.doAccountId) {
      this.logger.warn(`No droplet found for order ${orderId}`);
      return;
    }

    try {
      const token = await this.doAccountService.getDecryptedToken(task.doAccountId);
      const client = new DoApiClient(token);
      await client.performDropletAction(parseInt(task.dropletId), 'power_off');
      this.logger.debug(`Droplet ${task.dropletId} powered off`);
    } catch (error) {
      this.logger.error(
        `Failed to power off droplet ${task.dropletId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      // Don't throw - we still want to mark as suspended
    }
  }

  // ===========================================
  // Suspended VPS Processing
  // ===========================================

  /**
   * Process suspended VPS - destroy after grace period ends
   *
   * @returns Processing statistics
   */
  async processSuspendedVps(): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    const now = new Date();

    // Find suspended orders
    const suspendedOrders = await this.prisma.order.findMany({
      where: { status: OrderStatus.SUSPENDED },
    });

    for (const order of suspendedOrders) {
      // Skip if no suspendedAt (shouldn't happen, but safety check)
      if (!order.suspendedAt) {
        stats.skipped++;
        continue;
      }

      stats.processed++;

      const gracePeriodHours = this.getGracePeriodHours(order.billingPeriod);
      const graceEndsAt = addHours(order.suspendedAt, gracePeriodHours);

      if (now >= graceEndsAt) {
        // Grace period ended, terminate
        try {
          await this.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL);
          stats.succeeded++;
        } catch (error) {
          stats.failed++;
          stats.errors.push({
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.logger.error(
            `Failed to terminate suspended VPS for order ${order.id}`,
            error
          );
        }
      } else {
        stats.skipped++;
        this.logger.debug(
          `Order ${order.id} still in grace period until ${graceEndsAt.toISOString()}`
        );
      }
    }

    this.logger.log(
      `Suspended VPS processed: ${stats.succeeded}/${stats.processed} terminated, ${stats.skipped} still in grace period`
    );

    return stats;
  }

  // ===========================================
  // VPS Termination
  // ===========================================

  /**
   * Terminate a VPS - destroy on DigitalOcean
   *
   * @param order - The order to terminate
   * @param reason - Reason for termination
   */
  async terminateVps(order: Order, reason: TerminationReason): Promise<void> {
    const now = new Date();

    // Update status atomically
    const result = await this.prisma.order.updateMany({
      where: {
        id: order.id,
        status: {
          not: OrderStatus.TERMINATED, // Don't terminate twice
        },
        version: order.version,
      },
      data: {
        status: OrderStatus.TERMINATED,
        terminatedAt: now,
        terminationReason: reason,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      this.logger.warn(
        `Order ${order.id} was already terminated or modified, skipping`
      );
      return;
    }

    // Destroy droplet
    const destroyed = await this.destroyDroplet(order.id);

    // Create status history
    await this.prisma.statusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: order.status,
        newStatus: OrderStatus.TERMINATED,
        actor: 'system',
        reason: `VPS terminated: ${reason}`,
        metadata: {
          terminatedAt: now.toISOString(),
          reason,
          dropletDestroyed: destroyed,
        },
      },
    });

    // Send notification
    if (this.notificationClient) {
      await this.notificationClient.send({
        userId: order.userId,
        event: 'VPS_DESTROYED',
        data: {
          orderId: order.id,
          planName: order.planName,
          reason,
          terminatedAt: now.toISOString(),
        },
      });
    }

    this.logger.log(`VPS terminated for order ${order.id}: ${reason}`);
  }

  /**
   * Destroy a droplet via DigitalOcean API
   *
   * @returns true if droplet was destroyed, false otherwise
   */
  private async destroyDroplet(orderId: string): Promise<boolean> {
    const task = await this.prisma.provisioningTask.findUnique({
      where: { orderId },
    });

    if (!task?.dropletId || !task.doAccountId) {
      this.logger.warn(`No droplet found for order ${orderId}`);
      return false;
    }

    try {
      const token = await this.doAccountService.getDecryptedToken(task.doAccountId);
      const client = new DoApiClient(token);
      await client.deleteDroplet(parseInt(task.dropletId));

      // Update task status
      await this.prisma.provisioningTask.update({
        where: { id: task.id },
        data: { dropletStatus: 'destroyed' },
      });

      // Decrement DO account active count
      await this.doAccountService.decrementActiveCount(task.doAccountId);

      this.logger.log(`Droplet ${task.dropletId} destroyed for order ${orderId}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to destroy droplet ${task.dropletId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  // ===========================================
  // Manual Operations
  // ===========================================

  /**
   * Manually renew an order (for admin or user-initiated renewal)
   */
  async manualRenewal(
    orderId: string,
    userId: string,
    _renewalType: RenewalType = RenewalType.MANUAL_RENEWAL
  ): Promise<{ success: boolean; error?: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.userId !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    if (order.status === OrderStatus.TERMINATED) {
      return { success: false, error: 'Cannot renew terminated VPS' };
    }

    const success = await this.attemptRenewal(order);
    return { success, error: success ? undefined : 'Renewal failed' };
  }

  /**
   * Cancel user-initiated deletion request
   * (Admin can restore a suspended VPS before termination)
   */
  async restoreSuspendedVps(orderId: string): Promise<{ success: boolean; error?: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status !== OrderStatus.SUSPENDED) {
      return { success: false, error: 'VPS is not suspended' };
    }

    // Check if there's sufficient balance for renewal
    if (this.billingClient) {
      const hasSufficientBalance = await this.billingClient.checkSufficientBalance(
        order.userId,
        order.finalPrice
      );

      if (!hasSufficientBalance) {
        return { success: false, error: 'Insufficient balance for renewal' };
      }
    }

    // Attempt renewal which will restore to ACTIVE
    const success = await this.attemptRenewal(order);

    if (success) {
      // Power on the droplet
      await this.powerOnDroplet(order.id);
    }

    return { success, error: success ? undefined : 'Restoration failed' };
  }

  /**
   * Power on a droplet via DigitalOcean API
   */
  private async powerOnDroplet(orderId: string): Promise<void> {
    const task = await this.prisma.provisioningTask.findUnique({
      where: { orderId },
    });

    if (!task?.dropletId || !task.doAccountId) {
      return;
    }

    try {
      const token = await this.doAccountService.getDecryptedToken(task.doAccountId);
      const client = new DoApiClient(token);
      await client.performDropletAction(parseInt(task.dropletId), 'power_on');
      this.logger.debug(`Droplet ${task.dropletId} powered on`);
    } catch (error) {
      this.logger.error(
        `Failed to power on droplet ${task.dropletId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
