import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { QueueService, NotificationJob, JobHandler } from './queue.service';

// Create mock Redis instance that will be used across tests
const mockRedisInstance = {
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue('OK'),
  lpush: jest.fn().mockResolvedValue(1),
  llen: jest.fn().mockResolvedValue(0),
  lrem: jest.fn().mockResolvedValue(1),
  del: jest.fn().mockResolvedValue(1),
  rpoplpush: jest.fn().mockResolvedValue(null),
  lset: jest.fn().mockResolvedValue('OK'),
  brpoplpush: jest.fn().mockResolvedValue(null),
};

// Mock Redis before importing the service
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('QueueService', () => {
  let service: QueueService;

  const createConfigService = (redisUrl?: string) => ({
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_URL: redisUrl,
        QUEUE_MAX_ATTEMPTS: 3,
        QUEUE_POLL_INTERVAL: 1000,
      };
      return config[key] ?? defaultValue;
    }),
  });

  describe('with Redis available', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      // Reset mock implementations
      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockRedisInstance.llen.mockResolvedValue(0);
      mockRedisInstance.lpush.mockResolvedValue(1);
      mockRedisInstance.del.mockResolvedValue(1);
      mockRedisInstance.rpoplpush.mockResolvedValue(null);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: createConfigService('redis://localhost:6379'),
          },
        ],
      }).compile();

      service = module.get<QueueService>(QueueService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      service.stopProcessing();
      await service.onModuleDestroy();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('isQueueAvailable', () => {
      it('should return true when Redis is connected', () => {
        expect(service.isQueueAvailable()).toBe(true);
      });
    });

    describe('addJob', () => {
      it('should add job to queue and return job ID', async () => {
        const jobId = await service.addJob('ORDER_CREATED', 'user-123', {
          orderNumber: 'ORD-001',
        });

        expect(jobId).toBeDefined();
        expect(jobId).toContain('notif_');
        expect(mockRedisInstance.lpush).toHaveBeenCalled();
      });

      it('should create job with correct event and userId', async () => {
        const event = 'PAYMENT_CONFIRMED';
        const userId = 'user-456';
        const data = { amount: 100000 };

        await service.addJob(event, userId, data);

        expect(mockRedisInstance.lpush).toHaveBeenCalledWith(
          'notification:queue',
          expect.stringContaining('"event":"PAYMENT_CONFIRMED"')
        );
        expect(mockRedisInstance.lpush).toHaveBeenCalledWith(
          'notification:queue',
          expect.stringContaining('"userId":"user-456"')
        );
      });

      it('should include maxAttempts in job data', async () => {
        await service.addJob('VPS_ACTIVE', 'user-789', { ip: '1.2.3.4' });

        expect(mockRedisInstance.lpush).toHaveBeenCalledWith(
          'notification:queue',
          expect.stringContaining('"maxAttempts":3')
        );
      });

      it('should handle lpush failure gracefully', async () => {
        mockRedisInstance.lpush.mockRejectedValueOnce(new Error('Redis error'));

        const jobId = await service.addJob('ORDER_CREATED', 'user-123', {});

        expect(jobId).toBeNull();
      });
    });

    describe('getStats', () => {
      it('should return queue statistics', async () => {
        mockRedisInstance.llen
          .mockResolvedValueOnce(10) // pending
          .mockResolvedValueOnce(2)  // processing
          .mockResolvedValueOnce(5); // failed

        const stats = await service.getStats();

        expect(stats).toEqual({
          pending: 10,
          processing: 2,
          failed: 5,
          connected: true,
        });
      });

      it('should handle llen failure gracefully', async () => {
        mockRedisInstance.llen.mockRejectedValueOnce(new Error('Redis error'));

        const stats = await service.getStats();

        expect(stats).toEqual({
          pending: 0,
          processing: 0,
          failed: 0,
          connected: false,
        });
      });
    });

    describe('clearFailedJobs', () => {
      it('should clear failed jobs and return count', async () => {
        mockRedisInstance.llen.mockResolvedValueOnce(15);
        mockRedisInstance.del.mockResolvedValueOnce(1);

        const count = await service.clearFailedJobs();

        expect(count).toBe(15);
        expect(mockRedisInstance.del).toHaveBeenCalledWith('notification:failed');
      });

      it('should handle del failure gracefully', async () => {
        mockRedisInstance.llen.mockResolvedValueOnce(10);
        mockRedisInstance.del.mockRejectedValueOnce(new Error('Redis error'));

        const count = await service.clearFailedJobs();

        expect(count).toBe(0);
      });
    });

    describe('retryFailedJobs', () => {
      it('should retry failed jobs and return count', async () => {
        const failedJob = JSON.stringify({
          id: 'job-1',
          event: 'ORDER_CREATED',
          userId: 'user-123',
          data: {},
          attempts: 3,
          maxAttempts: 3,
        });

        mockRedisInstance.rpoplpush
          .mockResolvedValueOnce(failedJob)
          .mockResolvedValueOnce(null);

        const count = await service.retryFailedJobs();

        expect(count).toBe(1);
      });

      it('should reset attempts to 0 when retrying', async () => {
        const failedJob = JSON.stringify({
          id: 'job-1',
          event: 'ORDER_CREATED',
          userId: 'user-123',
          data: {},
          attempts: 3,
          maxAttempts: 3,
        });

        mockRedisInstance.rpoplpush
          .mockResolvedValueOnce(failedJob)
          .mockResolvedValueOnce(null);

        await service.retryFailedJobs();

        expect(mockRedisInstance.lset).toHaveBeenCalledWith(
          'notification:queue',
          0,
          expect.stringContaining('"attempts":0')
        );
      });

      it('should return 0 when no failed jobs', async () => {
        mockRedisInstance.rpoplpush.mockResolvedValue(null);

        const count = await service.retryFailedJobs();

        expect(count).toBe(0);
      });

      it('should handle rpoplpush failure gracefully', async () => {
        mockRedisInstance.rpoplpush.mockRejectedValueOnce(new Error('Redis error'));

        const count = await service.retryFailedJobs();

        expect(count).toBe(0);
      });
    });

    describe('registerHandler', () => {
      it('should register job handler without throwing', () => {
        const handler: JobHandler = jest.fn();

        expect(() => service.registerHandler(handler)).not.toThrow();
      });
    });

    describe('stopProcessing', () => {
      it('should stop processing without error', () => {
        const handler: JobHandler = jest.fn();
        service.registerHandler(handler);

        // Should not throw
        expect(() => service.stopProcessing()).not.toThrow();
      });
    });
  });

  describe('without Redis (synchronous fallback)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: createConfigService(undefined), // No REDIS_URL
          },
        ],
      }).compile();

      service = module.get<QueueService>(QueueService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await service.onModuleDestroy();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    describe('isQueueAvailable', () => {
      it('should return false when Redis is not configured', () => {
        expect(service.isQueueAvailable()).toBe(false);
      });
    });

    describe('addJob', () => {
      it('should return null when Redis is not available', async () => {
        const jobId = await service.addJob('ORDER_CREATED', 'user-123', {});

        expect(jobId).toBeNull();
      });
    });

    describe('getStats', () => {
      it('should return zeros when Redis is not available', async () => {
        const stats = await service.getStats();

        expect(stats).toEqual({
          pending: 0,
          processing: 0,
          failed: 0,
          connected: false,
        });
      });
    });

    describe('clearFailedJobs', () => {
      it('should return 0 when Redis is not available', async () => {
        const count = await service.clearFailedJobs();

        expect(count).toBe(0);
      });
    });

    describe('retryFailedJobs', () => {
      it('should return 0 when Redis is not available', async () => {
        const count = await service.retryFailedJobs();

        expect(count).toBe(0);
      });
    });

    describe('startProcessing', () => {
      it('should not start processing without Redis', async () => {
        const handler: JobHandler = jest.fn();
        service.registerHandler(handler);

        await service.startProcessing();

        // Should complete without error
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe('Redis connection failure handling', () => {
    it('should handle ping failure during init', async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Connection refused'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: createConfigService('redis://localhost:6379'),
          },
        ],
      }).compile();

      const failingService = module.get<QueueService>(QueueService);
      await failingService.onModuleInit();

      // Should fallback to unavailable state
      expect(failingService.isQueueAvailable()).toBe(false);
    });
  });
});
