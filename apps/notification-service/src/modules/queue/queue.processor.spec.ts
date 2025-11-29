import { Test, TestingModule } from '@nestjs/testing';

import { NotificationService } from '../notification/notification.service';

import { QueueProcessor } from './queue.processor';
import { QueueService, NotificationJob } from './queue.service';

describe('QueueProcessor', () => {
  let processor: QueueProcessor;
  let queueService: jest.Mocked<QueueService>;
  let notificationService: jest.Mocked<NotificationService>;

  const mockQueueService = {
    registerHandler: jest.fn(),
    isQueueAvailable: jest.fn(),
    startProcessing: jest.fn(),
  };

  const mockNotificationService = {
    processNotificationJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueProcessor,
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    processor = module.get<QueueProcessor>(QueueProcessor);
    queueService = module.get(QueueService);
    notificationService = module.get(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register handler and start processing when queue is available', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);

      await processor.onModuleInit();

      expect(mockQueueService.registerHandler).toHaveBeenCalled();
      expect(mockQueueService.startProcessing).toHaveBeenCalled();
    });

    it('should register handler but not start processing when queue is unavailable', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(false);

      await processor.onModuleInit();

      expect(mockQueueService.registerHandler).toHaveBeenCalled();
      expect(mockQueueService.startProcessing).not.toHaveBeenCalled();
    });

    it('should bind handleJob method to this context', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);

      await processor.onModuleInit();

      // Verify that a function was passed to registerHandler
      expect(mockQueueService.registerHandler).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('handleJob', () => {
    const mockJob: NotificationJob = {
      id: 'notif_123456_abc123',
      event: 'ORDER_CREATED',
      userId: 'user-123',
      data: {
        orderNumber: 'ORD-001',
        planName: 'VPS Basic',
      },
      createdAt: new Date().toISOString(),
      attempts: 1,
      maxAttempts: 3,
    };

    it('should process job and call notification service', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockResolvedValue(undefined);

      await processor.onModuleInit();

      // Get the registered handler
      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      // Call the handler with a mock job
      await registeredHandler(mockJob);

      expect(mockNotificationService.processNotificationJob).toHaveBeenCalledWith(
        mockJob.event,
        mockJob.userId,
        mockJob.data
      );
    });

    it('should pass correct parameters to notification service', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockResolvedValue(undefined);

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      const customJob: NotificationJob = {
        id: 'notif_custom',
        event: 'PAYMENT_CONFIRMED',
        userId: 'user-456',
        data: {
          amount: 150000,
          paymentMethod: 'BCA VA',
        },
        createdAt: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      await registeredHandler(customJob);

      expect(mockNotificationService.processNotificationJob).toHaveBeenCalledWith(
        'PAYMENT_CONFIRMED',
        'user-456',
        { amount: 150000, paymentMethod: 'BCA VA' }
      );
    });

    it('should handle notification service errors', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockRejectedValue(
        new Error('Email service unavailable')
      );

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      // The handler should propagate the error for retry logic
      await expect(registeredHandler(mockJob)).rejects.toThrow('Email service unavailable');
    });

    it('should process various event types', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockResolvedValue(undefined);

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      const eventTypes = [
        'ORDER_CREATED',
        'PAYMENT_CONFIRMED',
        'VPS_PROVISIONED',
        'VPS_ACTION_COMPLETED',
        'PASSWORD_RESET',
      ];

      for (const eventType of eventTypes) {
        const job: NotificationJob = {
          ...mockJob,
          event: eventType,
        };

        await registeredHandler(job);

        expect(mockNotificationService.processNotificationJob).toHaveBeenCalledWith(
          eventType,
          mockJob.userId,
          mockJob.data
        );
      }
    });
  });

  describe('Error handling', () => {
    it('should allow retry mechanism by throwing errors', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      const testError = new Error('Temporary failure');
      mockNotificationService.processNotificationJob.mockRejectedValue(testError);

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      const job: NotificationJob = {
        id: 'notif_retry',
        event: 'ORDER_CREATED',
        userId: 'user-123',
        data: {},
        createdAt: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      await expect(registeredHandler(job)).rejects.toThrow('Temporary failure');
    });
  });

  describe('Job data validation', () => {
    it('should handle jobs with empty data', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockResolvedValue(undefined);

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      const jobWithEmptyData: NotificationJob = {
        id: 'notif_empty',
        event: 'TEST_EVENT',
        userId: 'user-123',
        data: {},
        createdAt: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      await registeredHandler(jobWithEmptyData);

      expect(mockNotificationService.processNotificationJob).toHaveBeenCalledWith(
        'TEST_EVENT',
        'user-123',
        {}
      );
    });

    it('should handle jobs with complex data', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockNotificationService.processNotificationJob.mockResolvedValue(undefined);

      await processor.onModuleInit();

      const registeredHandler = mockQueueService.registerHandler.mock.calls[0][0];

      const complexData = {
        order: {
          id: 'order-123',
          items: [{ name: 'VPS Basic', price: 100000 }],
        },
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        metadata: {
          source: 'web',
          timestamp: new Date().toISOString(),
        },
      };

      const jobWithComplexData: NotificationJob = {
        id: 'notif_complex',
        event: 'ORDER_CREATED',
        userId: 'user-123',
        data: complexData,
        createdAt: new Date().toISOString(),
        attempts: 1,
        maxAttempts: 3,
      };

      await registeredHandler(jobWithComplexData);

      expect(mockNotificationService.processNotificationJob).toHaveBeenCalledWith(
        'ORDER_CREATED',
        'user-123',
        complexData
      );
    });
  });
});
