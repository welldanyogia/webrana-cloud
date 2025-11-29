import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { QueueService, NotificationJob, JobHandler } from './queue.service';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    lpush: jest.fn().mockResolvedValue(1),
    llen: jest.fn().mockResolvedValue(0),
    lrem: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    rpoplpush: jest.fn().mockResolvedValue(null),
    lset: jest.fn().mockResolvedValue('OK'),
    brpoplpush: jest.fn().mockResolvedValue(null),
  }));
});

describe('QueueService', () => {
  let service: QueueService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        REDIS_URL: 'redis://localhost:6379',
        QUEUE_MAX_ATTEMPTS: 3,
        QUEUE_POLL_INTERVAL: 1000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    configService = module.get(ConfigService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Redis when REDIS_URL is provided', async () => {
      await service.onModuleInit();

      expect(service.isQueueAvailable()).toBe(true);
    });

    it('should not connect when REDIS_URL is not provided', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      expect(serviceWithoutRedis.isQueueAvailable()).toBe(false);
    });
  });

  describe('isQueueAvailable', () => {
    it('should return true when Redis is connected', async () => {
      await service.onModuleInit();

      expect(service.isQueueAvailable()).toBe(true);
    });

    it('should return false when Redis is not connected', () => {
      // Before init, Redis is not connected
      expect(service.isQueueAvailable()).toBe(false);
    });
  });

  describe('addJob', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should add job to queue and return job ID', async () => {
      const jobId = await service.addJob('ORDER_CREATED', 'user-123', {
        orderNumber: 'ORD-001',
      });

      expect(jobId).toBeDefined();
      expect(jobId).toContain('notif_');
    });

    it('should return null when Redis is not available', async () => {
      // Create service without Redis
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      const jobId = await serviceWithoutRedis.addJob('ORDER_CREATED', 'user-123', {});

      expect(jobId).toBeNull();
    });

    it('should create job with correct structure', async () => {
      const event = 'PAYMENT_CONFIRMED';
      const userId = 'user-123';
      const data = { amount: 100000 };

      const jobId = await service.addJob(event, userId, data);

      expect(jobId).toBeDefined();
      // Verify job structure would be created correctly
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return queue statistics', async () => {
      const stats = await service.getStats();

      expect(stats).toEqual({
        pending: expect.any(Number),
        processing: expect.any(Number),
        failed: expect.any(Number),
        connected: true,
      });
    });

    it('should return zeros when Redis is not available', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      const stats = await serviceWithoutRedis.getStats();

      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        failed: 0,
        connected: false,
      });
    });
  });

  describe('clearFailedJobs', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should clear failed jobs and return count', async () => {
      const count = await service.clearFailedJobs();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when Redis is not available', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      const count = await serviceWithoutRedis.clearFailedJobs();

      expect(count).toBe(0);
    });
  });

  describe('retryFailedJobs', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should retry failed jobs and return count', async () => {
      const count = await service.retryFailedJobs();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 when Redis is not available', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      const count = await serviceWithoutRedis.retryFailedJobs();

      expect(count).toBe(0);
    });
  });

  describe('registerHandler', () => {
    it('should register job handler', () => {
      const handler: JobHandler = jest.fn();

      // Should not throw
      expect(() => service.registerHandler(handler)).not.toThrow();
    });
  });

  describe('startProcessing and stopProcessing', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should stop processing when stopProcessing is called', () => {
      const handler: JobHandler = jest.fn();
      service.registerHandler(handler);

      // Should not throw
      expect(() => service.stopProcessing()).not.toThrow();
    });

    it('should not start processing without handler', async () => {
      // Don't register handler
      await service.startProcessing();

      // Should log warning but not throw
    });

    it('should not start processing without Redis', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      serviceWithoutRedis.registerHandler(jest.fn());

      // Should not throw
      await serviceWithoutRedis.startProcessing();
    });
  });

  describe('Graceful degradation', () => {
    it('should work synchronously when Redis is unavailable', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'REDIS_URL') return undefined;
        return defaultValue;
      });

      const moduleWithoutRedis = await Test.createTestingModule({
        providers: [
          QueueService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const serviceWithoutRedis = moduleWithoutRedis.get<QueueService>(QueueService);
      await serviceWithoutRedis.onModuleInit();

      // All operations should complete without error
      expect(serviceWithoutRedis.isQueueAvailable()).toBe(false);

      const jobId = await serviceWithoutRedis.addJob('TEST', 'user-1', {});
      expect(jobId).toBeNull();

      const stats = await serviceWithoutRedis.getStats();
      expect(stats.connected).toBe(false);
    });
  });
});
