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

    it('should include channels for each template', () => {
      const result = controller.getTemplates();

      result.data.forEach((template) => {
        expect(template.channels).toBeDefined();
        expect(Array.isArray(template.channels)).toBe(true);
        expect(template.channels.length).toBeGreaterThan(0);
      });
    });

    it('should include description for each template', () => {
      const result = controller.getTemplates();

      result.data.forEach((template) => {
        expect(template.description).toBeDefined();
        expect(typeof template.description).toBe('string');
        expect(template.description.length).toBeGreaterThan(0);
      });
    });

    it('should have ORDER_CREATED with only EMAIL channel', () => {
      const result = controller.getTemplates();
      const orderTemplate = result.data.find((t) => t.event === 'ORDER_CREATED');

      expect(orderTemplate?.channels).toEqual(['EMAIL']);
    });

    it('should have PAYMENT_CONFIRMED with EMAIL and TELEGRAM channels', () => {
      const result = controller.getTemplates();
      const paymentTemplate = result.data.find((t) => t.event === 'PAYMENT_CONFIRMED');

      expect(paymentTemplate?.channels).toContain('EMAIL');
      expect(paymentTemplate?.channels).toContain('TELEGRAM');
    });
  });

  describe('sendNotification edge cases', () => {
    it('should handle VPS_ACTIVE event', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.VPS_ACTIVE,
        userId: 'user-123',
        data: {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          ipAddress: '192.168.1.100',
          hostname: 'vps-001.webrana.cloud',
          username: 'root',
          password: 'secret123',
          osName: 'Ubuntu 22.04',
          region: 'Singapore',
          expiresAt: '2024-02-15',
        },
      };

      const mockResult = {
        success: true,
        message: '2/2 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'SENT', recipient: 'test@example.com' },
          { channel: 'TELEGRAM', status: 'SENT', recipient: '123456789' },
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

    it('should handle PROVISIONING_FAILED event', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.PROVISIONING_FAILED,
        userId: 'user-123',
        data: {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          errorMessage: 'Insufficient capacity',
          supportEmail: 'support@webrana.cloud',
        },
      };

      const mockResult = {
        success: true,
        message: '2/2 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'SENT', recipient: 'test@example.com' },
          { channel: 'TELEGRAM', status: 'SENT', recipient: '123456789' },
        ],
      };

      mockNotificationService.notify.mockResolvedValue(mockResult);

      const result = await controller.sendNotification(dto);

      expect(result.data).toEqual(mockResult);
    });

    it('should handle PAYMENT_CONFIRMED event', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.PAYMENT_CONFIRMED,
        userId: 'user-123',
        data: {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          amount: 150000,
          paymentMethod: 'BCA VA',
          paidAt: '2024-01-15 10:30:00',
        },
      };

      const mockResult = {
        success: true,
        message: '2/2 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'SENT', recipient: 'test@example.com' },
          { channel: 'TELEGRAM', status: 'SENT', recipient: '123456789' },
        ],
      };

      mockNotificationService.notify.mockResolvedValue(mockResult);

      const result = await controller.sendNotification(dto);

      expect(result.data).toEqual(mockResult);
    });

    it('should handle partial notification failure', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.VPS_ACTIVE,
        userId: 'user-123',
        data: { orderNumber: 'ORD-001' },
      };

      const mockResult = {
        success: true,
        message: '1/2 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'SENT', recipient: 'test@example.com' },
          { channel: 'TELEGRAM', status: 'FAILED', error: 'Bot blocked by user' },
        ],
      };

      mockNotificationService.notify.mockResolvedValue(mockResult);

      const result = await controller.sendNotification(dto);

      expect(result.data.success).toBe(true);
      expect(result.data.notifications).toHaveLength(2);
    });

    it('should handle complete notification failure', async () => {
      const dto: SendNotificationDto = {
        event: NotificationEventType.ORDER_CREATED,
        userId: 'user-123',
        data: { orderNumber: 'ORD-001' },
      };

      const mockResult = {
        success: false,
        message: '0/1 notifications sent successfully',
        notifications: [
          { channel: 'EMAIL', status: 'FAILED', error: 'SMTP error' },
        ],
      };

      mockNotificationService.notify.mockResolvedValue(mockResult);

      const result = await controller.sendNotification(dto);

      expect(result.data.success).toBe(false);
    });
  });

  describe('getNotificationLogs edge cases', () => {
    it('should filter by event', async () => {
      const mockLogs = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      await controller.getNotificationLogs({
        page: 1,
        limit: 20,
        event: 'ORDER_CREATED',
      });

      expect(mockNotificationService.getNotificationLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        event: 'ORDER_CREATED',
      });
    });

    it('should filter by channel', async () => {
      const mockLogs = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      await controller.getNotificationLogs({
        page: 1,
        limit: 20,
        channel: 'EMAIL',
      });

      expect(mockNotificationService.getNotificationLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        channel: 'EMAIL',
      });
    });

    it('should filter by status', async () => {
      const mockLogs = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      await controller.getNotificationLogs({
        page: 1,
        limit: 20,
        status: 'SENT',
      });

      expect(mockNotificationService.getNotificationLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'SENT',
      });
    });

    it('should filter by userId', async () => {
      const mockLogs = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      await controller.getNotificationLogs({
        page: 1,
        limit: 20,
        userId: 'user-123',
      });

      expect(mockNotificationService.getNotificationLogs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        userId: 'user-123',
      });
    });

    it('should return multiple logs with pagination', async () => {
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
          {
            id: 'log-2',
            userId: 'user-123',
            event: 'PAYMENT_CONFIRMED',
            channel: 'TELEGRAM',
            status: 'SENT',
            recipient: '123456789',
            createdAt: '2024-01-15T11:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
      };

      mockNotificationService.getNotificationLogs.mockResolvedValue(mockLogs);

      const result = await controller.getNotificationLogs({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(50);
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('ApiKeyGuard protection', () => {
    it('should have ApiKeyGuard applied to controller', () => {
      const guards = Reflect.getMetadata('__guards__', NotificationController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });
  });
});
