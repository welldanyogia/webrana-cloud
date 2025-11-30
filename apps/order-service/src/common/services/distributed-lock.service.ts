import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

/**
 * Date utility functions for lock management
 */
function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Distributed Lock Service
 *
 * Provides database-based distributed locking for cron jobs
 * to ensure only one instance runs at a time across multiple
 * replicas.
 *
 * Uses PostgreSQL's unique constraint and atomic upsert to
 * ensure lock safety without requiring external dependencies
 * like Redis.
 *
 * Features:
 * - Atomic lock acquisition
 * - TTL-based automatic lock expiration
 * - Instance-based lock ownership
 * - Safe lock release (only owner can release)
 */
@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly instanceId = `instance_${process.pid}_${Date.now()}`;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the unique instance ID for this service instance
   */
  getInstanceId(): string {
    return this.instanceId;
  }

  /**
   * Attempt to acquire a lock for a specific job
   *
   * Uses atomic database operations to ensure only one instance
   * can acquire the lock at a time:
   * 1. Try to insert a new lock record
   * 2. If the lock exists but is expired, update it
   * 3. If the lock exists and is held by another instance, fail
   *
   * @param jobName - Unique identifier for the job
   * @param ttlSeconds - Time-to-live in seconds for the lock
   * @returns true if lock acquired, false otherwise
   */
  async acquireLock(jobName: string, ttlSeconds: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = addSeconds(now, ttlSeconds);

    try {
      // Use raw SQL for atomic upsert with conditional update
      // This ensures we only acquire the lock if:
      // 1. No lock exists (INSERT)
      // 2. Lock exists but is expired (UPDATE with expires_at < now)
      // 3. Lock is held by this instance (UPDATE with locked_by = instanceId)
      await this.prisma.$executeRaw`
        INSERT INTO cron_job_locks (id, job_name, locked_at, locked_by, expires_at)
        VALUES (gen_random_uuid(), ${jobName}, ${now}, ${this.instanceId}, ${expiresAt})
        ON CONFLICT (job_name) DO UPDATE
        SET locked_at = ${now}, locked_by = ${this.instanceId}, expires_at = ${expiresAt}
        WHERE cron_job_locks.expires_at < ${now}
        OR cron_job_locks.locked_by = ${this.instanceId}
      `;

      // Verify we got the lock by checking who holds it
      const lock = await this.prisma.cronJobLock.findUnique({
        where: { jobName },
      });

      const acquired = lock?.lockedBy === this.instanceId;

      if (acquired) {
        this.logger.debug(`Lock acquired: ${jobName} by ${this.instanceId}`);
      } else {
        this.logger.debug(
          `Lock not acquired: ${jobName} (held by ${lock?.lockedBy})`
        );
      }

      return acquired;
    } catch (error) {
      this.logger.warn(
        `Failed to acquire lock ${jobName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Release a lock for a specific job
   *
   * Only releases the lock if this instance owns it.
   * Safe to call even if this instance doesn't own the lock.
   *
   * @param jobName - Unique identifier for the job
   */
  async releaseLock(jobName: string): Promise<void> {
    try {
      const result = await this.prisma.cronJobLock.deleteMany({
        where: {
          jobName,
          lockedBy: this.instanceId,
        },
      });

      if (result.count > 0) {
        this.logger.debug(`Lock released: ${jobName}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to release lock ${jobName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute a function with a distributed lock
   *
   * Acquires the lock, executes the function, and releases the lock.
   * Returns null if the lock couldn't be acquired (another instance
   * is running the job).
   *
   * @param jobName - Unique identifier for the job
   * @param ttlSeconds - Time-to-live in seconds for the lock
   * @param fn - Async function to execute while holding the lock
   * @returns Result of fn, or null if lock not acquired
   */
  async withLock<T>(
    jobName: string,
    ttlSeconds: number,
    fn: () => Promise<T>
  ): Promise<T | null> {
    const acquired = await this.acquireLock(jobName, ttlSeconds);

    if (!acquired) {
      this.logger.debug(
        `Skipping job ${jobName}: another instance holds the lock`
      );
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(jobName);
    }
  }

  /**
   * Extend the TTL of an existing lock
   *
   * Useful for long-running jobs that need to keep the lock
   * beyond the initial TTL.
   *
   * @param jobName - Unique identifier for the job
   * @param additionalSeconds - Additional seconds to add to TTL
   * @returns true if lock was extended, false otherwise
   */
  async extendLock(jobName: string, additionalSeconds: number): Promise<boolean> {
    const now = new Date();
    const newExpiresAt = addSeconds(now, additionalSeconds);

    try {
      const result = await this.prisma.cronJobLock.updateMany({
        where: {
          jobName,
          lockedBy: this.instanceId,
        },
        data: {
          expiresAt: newExpiresAt,
        },
      });

      return result.count > 0;
    } catch (error) {
      this.logger.warn(
        `Failed to extend lock ${jobName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
  }

  /**
   * Check if a lock is currently held (by any instance)
   *
   * @param jobName - Unique identifier for the job
   * @returns true if lock is held and not expired, false otherwise
   */
  async isLocked(jobName: string): Promise<boolean> {
    const lock = await this.prisma.cronJobLock.findUnique({
      where: { jobName },
    });

    return lock !== null && lock.expiresAt > new Date();
  }

  /**
   * Get info about a specific lock
   *
   * @param jobName - Unique identifier for the job
   * @returns Lock info or null if no lock exists
   */
  async getLockInfo(
    jobName: string
  ): Promise<{ lockedBy: string; lockedAt: Date; expiresAt: Date } | null> {
    const lock = await this.prisma.cronJobLock.findUnique({
      where: { jobName },
    });

    if (!lock) return null;

    return {
      lockedBy: lock.lockedBy,
      lockedAt: lock.lockedAt,
      expiresAt: lock.expiresAt,
    };
  }

  /**
   * Clean up expired locks
   *
   * Can be run periodically to clean up stale lock records.
   * Note: Locks are automatically ignored when expired, so this
   * is just for database hygiene.
   *
   * @returns Number of locks cleaned up
   */
  async cleanupExpiredLocks(): Promise<number> {
    const result = await this.prisma.cronJobLock.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired locks`);
    }

    return result.count;
  }
}
