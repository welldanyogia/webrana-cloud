import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import { NotificationEventType, SendNotificationDto } from './dto/notification.dto';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

describe('NotificationController', () => {
  let controller: NotificationController;
  let _notificationService: NotificationService;

  const mockNotificationService = {
    notify: jest.fn(),
    getNotificationLogs: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      if (key === 'INTERNAL_API_KEY') return 'test-api-key';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationController>(NotificationController);
    _notificationService = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send notification and return result', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.ORDER_CREATED,
        userId: 'user-123',
        data: {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        },
      };

      const mockResult = {
        success: true,
        message: '1/1 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'SENT', recipient: 'test@example.com' },
        ],
      };

      mockNotificationService.notify.mockResolvedValue(mockResult);

      const result = await controller.sendNotification(dto);

      expect(result.data).toEqual(mockResult);
      expect(mockNotificationService.notify).toHaveBeenCalledWith(
        dto.event,
        dto.userId,
        dto.data
      );
    });
  });

  describe('getNotificationLogs', () => {
    it('should return paginated logs', async () => {
      const mockLogs = {
        data: [
          {
            id: 'log-1',
            userId: 'user-123',
            event: 'ORDER_CREATED',
            channel: 'EMAIL',
            status: 'SENT',
            recipient: 'test@example.com',
            createdAt: '2024-01-15T10:30:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      const result = await controller.getNotificationLogs({
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockLogs);
    });
  });

  describe('getTemplates', () => {
    it('should return available templates', () => {
      const result = controller.getTemplates();

      expect(result.data).toHaveLength(4);
      expect(result.data.map((t) => t.event)).toEqual([
        'ORDER_CREATED',
        'PAYMENT_CONFIRMED',
        'VPS_ACTIVE',
        'PROVISIONING_FAILED',
      ]);
    });
  });
});
