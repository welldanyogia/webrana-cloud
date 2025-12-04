import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEvent } from '@prisma/client';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { NotificationListResponseDto, UnreadCountResponseDto } from './dto';
import { UserNotificationController } from './user-notification.controller';
import { UserNotificationService } from './user-notification.service';

describe('UserNotificationController', () => {
  let controller: UserNotificationController;
  let _service: UserNotificationService;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'USER',
  };

  const mockNotification = {
    id: 'notif-123',
    userId: 'user-123',
    title: 'Test Notification',
    message: 'This is a test message',
    type: NotificationEvent.ORDER_CREATED,
    actionUrl: '/orders/123',
    metadata: { orderId: '123' },
    isRead: false,
    readAt: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockNotificationResponse = {
    id: mockNotification.id,
    userId: mockNotification.userId,
    title: mockNotification.title,
    message: mockNotification.message,
    type: mockNotification.type,
    actionUrl: mockNotification.actionUrl,
    metadata: mockNotification.metadata,
    isRead: mockNotification.isRead,
    readAt: undefined,
    createdAt: mockNotification.createdAt.toISOString(),
  };

  const mockUserNotificationService = {
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_ALGORITHM: 'HS256',
        JWT_SECRET: 'test-secret',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserNotificationController],
      providers: [
        { provide: UserNotificationService, useValue: mockUserNotificationService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<UserNotificationController>(UserNotificationController);
    _service = module.get<UserNotificationService>(UserNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return paginated notifications for the user', async () => {
      const expectedResponse: NotificationListResponseDto = {
        data: [mockNotificationResponse],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockUserNotificationService.getNotifications.mockResolvedValue(expectedResponse);

      const result = await controller.getNotifications(mockUser, { page: 1, limit: 20 });

      expect(result).toEqual(expectedResponse);
      expect(mockUserNotificationService.getNotifications).toHaveBeenCalledWith(
        mockUser.userId,
        { page: 1, limit: 20 }
      );
    });

    it('should pass filter parameters to service', async () => {
      const expectedResponse: NotificationListResponseDto = {
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      mockUserNotificationService.getNotifications.mockResolvedValue(expectedResponse);

      await controller.getNotifications(mockUser, { page: 2, limit: 10, isRead: false });

      expect(mockUserNotificationService.getNotifications).toHaveBeenCalledWith(
        mockUser.userId,
        { page: 2, limit: 10, isRead: false }
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for the user', async () => {
      const expectedResponse: UnreadCountResponseDto = { count: 5 };
      mockUserNotificationService.getUnreadCount.mockResolvedValue(expectedResponse);

      const result = await controller.getUnreadCount(mockUser);

      expect(result).toEqual(expectedResponse);
      expect(mockUserNotificationService.getUnreadCount).toHaveBeenCalledWith(
        mockUser.userId
      );
    });

    it('should return zero when no unread notifications', async () => {
      const expectedResponse: UnreadCountResponseDto = { count: 0 };
      mockUserNotificationService.getUnreadCount.mockResolvedValue(expectedResponse);

      const result = await controller.getUnreadCount(mockUser);

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockUserNotificationService.markAsRead.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await controller.markAsRead(mockUser, 'notif-123');

      expect(result).toEqual({
        success: true,
        message: 'Notifikasi berhasil ditandai sudah dibaca',
      });
      expect(mockUserNotificationService.markAsRead).toHaveBeenCalledWith(
        mockUser.userId,
        'notif-123'
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and return count', async () => {
      mockUserNotificationService.markAllAsRead.mockResolvedValue({ count: 3 });

      const result = await controller.markAllAsRead(mockUser);

      expect(result).toEqual({
        success: true,
        message: '3 notifikasi berhasil ditandai sudah dibaca',
        count: 3,
      });
      expect(mockUserNotificationService.markAllAsRead).toHaveBeenCalledWith(
        mockUser.userId
      );
    });

    it('should handle zero notifications gracefully', async () => {
      mockUserNotificationService.markAllAsRead.mockResolvedValue({ count: 0 });

      const result = await controller.markAllAsRead(mockUser);

      expect(result).toEqual({
        success: true,
        message: '0 notifikasi berhasil ditandai sudah dibaca',
        count: 0,
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockUserNotificationService.deleteNotification.mockResolvedValue(undefined);

      const result = await controller.deleteNotification(mockUser, 'notif-123');

      expect(result).toEqual({
        success: true,
        message: 'Notifikasi berhasil dihapus',
      });
      expect(mockUserNotificationService.deleteNotification).toHaveBeenCalledWith(
        mockUser.userId,
        'notif-123'
      );
    });
  });

  describe('JwtAuthGuard', () => {
    it('should have JwtAuthGuard applied to controller', () => {
      const guards = Reflect.getMetadata('__guards__', UserNotificationController);
      expect(guards).toBeDefined();
      expect(guards).toContain(JwtAuthGuard);
    });
  });
});
