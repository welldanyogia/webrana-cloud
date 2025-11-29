import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  setupTestRedis,
  teardownTestRedis,
  isDockerAvailable,
} from '../helpers/test-database';
import { QueueService, NotificationJob } from '../../src/modules/queue/queue.service';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(runIntegrationTests ? describe : describe.skip)('Queue Integration Tests', () => {
  let queueService: QueueService;
  let testModule: TestingModule;
  let redisClient: Redis;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      return;
    }

    // Setup Redis container
    const redisConfig = await setupTestRedis();

    // Create a Redis client for test verification
    redisClient = new Redis(redisConfig.url);

    // Create test module with the QueueService
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              REDIS_URL: redisConfig.url,
              QUEUE_MAX_ATTEMPTS: 3,
              QUEUE_POLL_INTERVAL: 100, // Fast polling for tests
            }),
          ],
        }),
      ],
      providers: [QueueService],
    }).compile();

    queueService = testModule.get<QueueService>(QueueService);

    // Initialize the service
    await queueService.onModuleInit();
  }, 180000);

  afterAll(async () => {
    if (queueService) {
      queueService.stopProcessing();
      await queueService.onModuleDestroy();
    }
    if (redisClient) {
      await redisClient.quit();
    }
    if (testModule) {
      await testModule.close();
    }
    if (dockerAvailable) {
      await teardownTestRedis();
    }
  });

  beforeEach(async () => {
    if (!dockerAvailable) return;

    // Clear all queues
    await redisClient.del('notification:queue');
    await redisClient.del('notification:processing');
    await redisClient.del('notification:failed');
  });

  describe('Queue Availability', () => {
    it('should report queue as available when Redis is connected', async () => {
      if (!dockerAvailable) return;

      expect(queueService.isQueueAvailable()).toBe(true);
    });
  });

  describe('Job Enqueue', () => {
    it('should enqueue notification job successfully', async () => {
      if (!dockerAvailable) return;

      const jobId = await queueService.addJob(
        'ORDER_CREATED',
        'user-123',
        { orderNumber: 'ORD-001' }
      );

      expect(jobId).toBeDefined();
      expect(jobId).toMatch(/^notif_\d+_[a-z0-9]+$/);

      // Verify job is in queue
      const queueLength = await redisClient.llen('notification:queue');
      expect(queueLength).toBe(1);

      // Verify job data
      const jobData = await redisClient.lindex('notification:queue', 0);
      expect(jobData).toBeDefined();

      const job = JSON.parse(jobData!);
      expect(job.event).toBe('ORDER_CREATED');
      expect(job.userId).toBe('user-123');
      expect(job.data).toEqual({ orderNumber: 'ORD-001' });
      expect(job.attempts).toBe(0);
      expect(job.maxAttempts).toBe(3);
    });

    it('should enqueue multiple jobs', async () => {
      if (!dockerAvailable) return;

      await queueService.addJob('ORDER_CREATED', 'user-1', { orderNumber: 'ORD-001' });
      await queueService.addJob('PAYMENT_CONFIRMED', 'user-2', { orderNumber: 'ORD-002' });
      await queueService.addJob('VPS_ACTIVE', 'user-3', { orderNumber: 'ORD-003' });

      const stats = await queueService.getStats();
      expect(stats.pending).toBe(3);
      expect(stats.processing).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.connected).toBe(true);
    });
  });

  describe('Job Processing', () => {
    it('should process enqueued jobs successfully', async () => {
      if (!dockerAvailable) return;

      const processedJobs: NotificationJob[] = [];

      // Register handler
      queueService.registerHandler(async (job) => {
        processedJobs.push(job);
      });

      // Add job
      await queueService.addJob('ORDER_CREATED', 'user-123', { orderNumber: 'ORD-001' });

      // Start processing
      queueService.startProcessing();

      // Wait for job to be processed
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stop processing
      queueService.stopProcessing();

      expect(processedJobs.length).toBe(1);
      expect(processedJobs[0].event).toBe('ORDER_CREATED');
      expect(processedJobs[0].userId).toBe('user-123');
      expect(processedJobs[0].attempts).toBe(1);
    });

    it('should retry failed jobs', async () => {
      if (!dockerAvailable) return;

      let attemptCount = 0;

      // Register handler that fails twice then succeeds
      queueService.registerHandler(async (job) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Simulated failure');
        }
      });

      // Add job
      await queueService.addJob('ORDER_CREATED', 'user-123', { orderNumber: 'ORD-001' });

      // Start processing
      queueService.startProcessing();

      // Wait for retries (3 attempts with some delay)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Stop processing
      queueService.stopProcessing();

      // Should have attempted 3 times (2 failures + 1 success)
      expect(attemptCount).toBe(3);

      // Queue should be empty (job succeeded on 3rd attempt)
      const stats = await queueService.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should move job to failed queue after max attempts', async () => {
      if (!dockerAvailable) return;

      let attemptCount = 0;

      // Register handler that always fails
      queueService.registerHandler(async () => {
        attemptCount++;
        throw new Error('Always fails');
      });

      // Add job
      await queueService.addJob('ORDER_CREATED', 'user-123', { orderNumber: 'ORD-001' });

      // Start processing
      queueService.startProcessing();

      // Wait for all retries
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Stop processing
      queueService.stopProcessing();

      // Should have attempted max times (3)
      expect(attemptCount).toBe(3);

      // Job should be in failed queue
      const stats = await queueService.getStats();
      expect(stats.pending).toBe(0);
      expect(stats.failed).toBe(1);

      // Verify failed job data
      const failedJobData = await redisClient.lindex('notification:failed', 0);
      expect(failedJobData).toBeDefined();

      const failedJob = JSON.parse(failedJobData!);
      expect(failedJob.event).toBe('ORDER_CREATED');
      expect(failedJob.attempts).toBe(3);
      expect(failedJob.error).toBe('Always fails');
      expect(failedJob.failedAt).toBeDefined();
    });
  });

  describe('Queue Management', () => {
    it('should get accurate queue statistics', async () => {
      if (!dockerAvailable) return;

      // Add jobs to different queues
      await queueService.addJob('ORDER_CREATED', 'user-1', {});
      await queueService.addJob('PAYMENT_CONFIRMED', 'user-2', {});

      // Manually add a failed job
      await redisClient.lpush(
        'notification:failed',
        JSON.stringify({ id: 'failed-1', event: 'TEST' })
      );

      const stats = await queueService.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(0);
      expect(stats.failed).toBe(1);
      expect(stats.connected).toBe(true);
    });

    it('should clear failed jobs', async () => {
      if (!dockerAvailable) return;

      // Add failed jobs
      await redisClient.lpush(
        'notification:failed',
        JSON.stringify({ id: 'failed-1' }),
        JSON.stringify({ id: 'failed-2' }),
        JSON.stringify({ id: 'failed-3' })
      );

      const clearedCount = await queueService.clearFailedJobs();
      expect(clearedCount).toBe(3);

      const stats = await queueService.getStats();
      expect(stats.failed).toBe(0);
    });

    it('should retry failed jobs', async () => {
      if (!dockerAvailable) return;

      // Add failed jobs
      await redisClient.lpush(
        'notification:failed',
        JSON.stringify({ id: 'failed-1', event: 'TEST1', attempts: 3 }),
        JSON.stringify({ id: 'failed-2', event: 'TEST2', attempts: 3 })
      );

      const retriedCount = await queueService.retryFailedJobs();
      expect(retriedCount).toBe(2);

      // Failed jobs should now be in main queue
      const stats = await queueService.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.failed).toBe(0);
    });
  });
});
