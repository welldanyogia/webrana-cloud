import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

describe('QueueController', () => {
  let controller: QueueController;
  let queueService: jest.Mocked<QueueService>;

  const mockQueueService = {
    getStats: jest.fn(),
    retryFailedJobs: jest.fn(),
    clearFailedJobs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueueController],
      providers: [
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'INTERNAL_API_KEY') return 'test-api-key';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<QueueController>(QueueController);
    queueService = module.get(QueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStats', () => {
    it('should return queue statistics when queue is connected', async () => {
      const mockStats = {
        pending: 10,
        processing: 2,
        failed: 1,
        connected: true,
      };

      mockQueueService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual({
        data: {
          ...mockStats,
          status: 'healthy',
        },
      });
      expect(mockQueueService.getStats).toHaveBeenCalled();
    });

    it('should return disconnected status when queue is not connected', async () => {
      const mockStats = {
        pending: 0,
        processing: 0,
        failed: 0,
        connected: false,
      };

      mockQueueService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual({
        data: {
          ...mockStats,
          status: 'disconnected',
        },
      });
    });

    it('should include all queue metrics', async () => {
      const mockStats = {
        pending: 100,
        processing: 5,
        failed: 25,
        connected: true,
      };

      mockQueueService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result.data.pending).toBe(100);
      expect(result.data.processing).toBe(5);
      expect(result.data.failed).toBe(25);
      expect(result.data.connected).toBe(true);
    });
  });

  describe('retryFailed', () => {
    it('should retry failed jobs and return count', async () => {
      mockQueueService.retryFailedJobs.mockResolvedValue(5);

      const result = await controller.retryFailed();

      expect(result).toEqual({
        data: {
          retriedCount: 5,
          message: '5 failed jobs requeued for retry',
        },
      });
      expect(mockQueueService.retryFailedJobs).toHaveBeenCalled();
    });

    it('should return zero when no failed jobs to retry', async () => {
      mockQueueService.retryFailedJobs.mockResolvedValue(0);

      const result = await controller.retryFailed();

      expect(result).toEqual({
        data: {
          retriedCount: 0,
          message: '0 failed jobs requeued for retry',
        },
      });
    });

    it('should handle large number of retried jobs', async () => {
      mockQueueService.retryFailedJobs.mockResolvedValue(1000);

      const result = await controller.retryFailed();

      expect(result.data.retriedCount).toBe(1000);
    });
  });

  describe('clearFailed', () => {
    it('should clear failed jobs and return count', async () => {
      mockQueueService.clearFailedJobs.mockResolvedValue(10);

      const result = await controller.clearFailed();

      expect(result).toEqual({
        data: {
          clearedCount: 10,
          message: '10 failed jobs cleared',
        },
      });
      expect(mockQueueService.clearFailedJobs).toHaveBeenCalled();
    });

    it('should return zero when no failed jobs to clear', async () => {
      mockQueueService.clearFailedJobs.mockResolvedValue(0);

      const result = await controller.clearFailed();

      expect(result).toEqual({
        data: {
          clearedCount: 0,
          message: '0 failed jobs cleared',
        },
      });
    });

    it('should handle clearing large number of jobs', async () => {
      mockQueueService.clearFailedJobs.mockResolvedValue(5000);

      const result = await controller.clearFailed();

      expect(result.data.clearedCount).toBe(5000);
    });
  });

  describe('Guard validation', () => {
    it('should be protected by ApiKeyGuard decorator', () => {
      const metadata = Reflect.getMetadata('__guards__', QueueController);
      expect(metadata).toBeDefined();
      expect(metadata.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HTTP status codes', () => {
    it('getStats should return 200 by default', async () => {
      mockQueueService.getStats.mockResolvedValue({
        pending: 0,
        processing: 0,
        failed: 0,
        connected: true,
      });

      // The controller doesn't throw, so default is 200
      await expect(controller.getStats()).resolves.toBeDefined();
    });

    it('retryFailed should be decorated with HttpCode 200', () => {
      // Verify @HttpCode(HttpStatus.OK) is applied
      const metadata = Reflect.getMetadata('__httpCode__', controller.retryFailed);
      expect(metadata).toBe(200);
    });

    it('clearFailed should be decorated with HttpCode 200', () => {
      // Verify @HttpCode(HttpStatus.OK) is applied
      const metadata = Reflect.getMetadata('__httpCode__', controller.clearFailed);
      expect(metadata).toBe(200);
    });
  });
});
