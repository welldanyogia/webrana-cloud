import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface NotificationJob {
  id: string;
  event: string;
  userId: string;
  data: Record<string, any>;
  createdAt: string;
  attempts: number;
  maxAttempts: number;
}

export type JobHandler = (job: NotificationJob) => Promise<void>;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isProcessing = false;
  private jobHandler: JobHandler | null = null;

  private readonly queueKey = 'notification:queue';
  private readonly processingKey = 'notification:processing';
  private readonly failedKey = 'notification:failed';
  private readonly maxAttempts: number;
  private readonly pollInterval: number;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = this.configService.get<number>('QUEUE_MAX_ATTEMPTS', 3);
    this.pollInterval = this.configService.get<number>('QUEUE_POLL_INTERVAL', 1000);
  }

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL not configured. Queue service will run in synchronous mode.'
      );
      return;
    }

    try {
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });

      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 200, 2000);
        },
      });

      await this.publisher.ping();
      this.logger.log('Redis queue connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error}`);
      this.publisher = null;
      this.subscriber = null;
    }
  }

  async onModuleDestroy() {
    this.isProcessing = false;

    if (this.publisher) {
      await this.publisher.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  /**
   * Check if queue is available (Redis connected)
   */
  isQueueAvailable(): boolean {
    return this.publisher !== null;
  }

  /**
   * Add a job to the notification queue
   */
  async addJob(
    event: string,
    userId: string,
    data: Record<string, any>
  ): Promise<string | null> {
    const job: NotificationJob = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      event,
      userId,
      data,
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: this.maxAttempts,
    };

    if (!this.publisher) {
      this.logger.debug('Queue not available, returning null for sync processing');
      return null;
    }

    try {
      await this.publisher.lpush(this.queueKey, JSON.stringify(job));
      this.logger.debug(`Job ${job.id} added to queue`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to add job to queue: ${error}`);
      return null;
    }
  }

  /**
   * Register job handler and start processing
   */
  registerHandler(handler: JobHandler) {
    this.jobHandler = handler;
  }

  /**
   * Start processing jobs from the queue
   */
  async startProcessing() {
    if (!this.subscriber || !this.jobHandler) {
      this.logger.warn('Cannot start processing: Redis not connected or no handler registered');
      return;
    }

    if (this.isProcessing) {
      this.logger.warn('Queue processor is already running');
      return;
    }

    this.isProcessing = true;
    this.logger.log('Starting queue processor');

    this.processLoop();
  }

  /**
   * Stop processing jobs
   */
  stopProcessing() {
    this.isProcessing = false;
    this.logger.log('Queue processor stopped');
  }

  /**
   * Main processing loop
   */
  private async processLoop() {
    while (this.isProcessing && this.subscriber) {
      try {
        // Use BRPOPLPUSH for reliable queue processing
        // Move job from queue to processing list atomically
        const jobData = await this.subscriber.brpoplpush(
          this.queueKey,
          this.processingKey,
          1 // 1 second timeout
        );

        if (jobData) {
          await this.processJob(jobData);
        }
      } catch (error) {
        if (this.isProcessing) {
          this.logger.error(`Error in process loop: ${error}`);
          await this.sleep(this.pollInterval);
        }
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(jobData: string) {
    let job: NotificationJob;

    try {
      job = JSON.parse(jobData);
    } catch (error) {
      this.logger.error(`Failed to parse job data: ${jobData}`);
      await this.publisher?.lrem(this.processingKey, 1, jobData);
      return;
    }

    job.attempts++;
    this.logger.log(`Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);

    try {
      if (this.jobHandler) {
        await this.jobHandler(job);
      }

      // Success - remove from processing
      await this.publisher?.lrem(this.processingKey, 1, jobData);
      this.logger.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error}`);

      // Remove from processing
      await this.publisher?.lrem(this.processingKey, 1, jobData);

      if (job.attempts < job.maxAttempts) {
        // Retry - add back to queue with updated attempts
        const updatedJobData = JSON.stringify(job);
        await this.publisher?.lpush(this.queueKey, updatedJobData);
        this.logger.log(`Job ${job.id} requeued for retry`);
      } else {
        // Max attempts reached - move to failed queue
        await this.publisher?.lpush(this.failedKey, JSON.stringify({
          ...job,
          failedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        }));
        this.logger.error(`Job ${job.id} moved to failed queue after ${job.maxAttempts} attempts`);
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    connected: boolean;
  }> {
    if (!this.publisher) {
      return { pending: 0, processing: 0, failed: 0, connected: false };
    }

    try {
      const [pending, processing, failed] = await Promise.all([
        this.publisher.llen(this.queueKey),
        this.publisher.llen(this.processingKey),
        this.publisher.llen(this.failedKey),
      ]);

      return { pending, processing, failed, connected: true };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error}`);
      return { pending: 0, processing: 0, failed: 0, connected: false };
    }
  }

  /**
   * Clear failed jobs
   */
  async clearFailedJobs(): Promise<number> {
    if (!this.publisher) return 0;

    try {
      const count = await this.publisher.llen(this.failedKey);
      await this.publisher.del(this.failedKey);
      return count;
    } catch (error) {
      this.logger.error(`Failed to clear failed jobs: ${error}`);
      return 0;
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(): Promise<number> {
    if (!this.publisher) return 0;

    try {
      let count = 0;
      while (true) {
        const jobData = await this.publisher.rpoplpush(this.failedKey, this.queueKey);
        if (!jobData) break;

        // Reset attempts for retry
        const job = JSON.parse(jobData);
        job.attempts = 0;
        await this.publisher.lset(this.queueKey, 0, JSON.stringify(job));
        count++;
      }
      return count;
    } catch (error) {
      this.logger.error(`Failed to retry failed jobs: ${error}`);
      return 0;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
