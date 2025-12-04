import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEvent } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { CreateInAppNotificationDto, InAppNotificationType } from './dto';
import { UserNotificationService } from './user-notification.service';

describe('UserNotificationService', () => {
  let service: UserNotificationService;
  let _prismaService: PrismaService;

  const mockPrismaService = {
    inAppNotification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserNotificationService>(UserNotificationService);
    _prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new in-app notification', async () => {
      const createDto: CreateInAppNotificationDto = {
        userId: 'user-123',
        title: 'Order Created',
        message: 'Your order #123 has been created',
        type: InAppNotificationType.ORDER_CREATED,
        actionUrl: '/orders/123',
        metadata: { orderId: '123' },
      };

      mockPrismaService.inAppNotification.create.mockResolvedValue(mockNotification);

      const result = await service.create(createDto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.inAppNotification.create).toHaveBeenCalledWith({
        data: {
          userId: createDto.userId,
          title: createDto.title,
          message: createDto.message,
          type: createDto.type,
          actionUrl: createDto.actionUrl,
          metadata: createDto.metadata,
        },
      });
    });

    it('should create notification without optional fields', async () => {
      const createDto: CreateInAppNotificationDto = {
        userId: 'user-123',
        title: 'System Announcement',
        message: 'System maintenance scheduled',
        type: InAppNotificationType.SYSTEM_ANNOUNCEMENT,
      };

      const expectedNotif = {
        ...mockNotification,
        title: createDto.title,
        message: createDto.message,
        type: NotificationEvent.SYSTEM_ANNOUNCEMENT,
        actionUrl: null,
        metadata: null,
      };

      mockPrismaService.inAppNotification.create.mockResolvedValue(expectedNotif);

      const result = await service.create(createDto);

      expect(result).toEqual(expectedNotif);
      expect(mockPrismaService.inAppNotification.create).toHaveBeenCalledWith({
        data: {
          userId: createDto.userId,
          title: createDto.title,
          message: createDto.message,
          type: createDto.type,
          actionUrl: undefined,
          metadata: undefined,
        },
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications for a user', async () => {
      const notifications = [mockNotification];
      mockPrismaService.inAppNotification.findMany.mockResolvedValue(notifications);
      mockPrismaService.inAppNotification.count.mockResolvedValue(1);

      const result = await service.getNotifications('user-123', { page: 1, limit: 20 });

      expect(result).toEqual({
        data: [
          {
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
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });

      expect(mockPrismaService.inAppNotification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by isRead when specified', async () => {
      mockPrismaService.inAppNotification.findMany.mockResolvedValue([]);
      mockPrismaService.inAppNotification.count.mockResolvedValue(0);

      await service.getNotifications('user-123', { page: 1, limit: 20, isRead: false });

      expect(mockPrismaService.inAppNotification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', isRead: false },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply correct pagination offset', async () => {
      mockPrismaService.inAppNotification.findMany.mockResolvedValue([]);
      mockPrismaService.inAppNotification.count.mockResolvedValue(50);

      const result = await service.getNotifications('user-123', { page: 3, limit: 10 });

      expect(mockPrismaService.inAppNotification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 20, // (3 - 1) * 10
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      expect(result.meta.totalPages).toBe(5);
    });

    it('should use default pagination values when not provided', async () => {
      mockPrismaService.inAppNotification.findMany.mockResolvedValue([]);
      mockPrismaService.inAppNotification.count.mockResolvedValue(0);

      await service.getNotifications('user-123', {});

      expect(mockPrismaService.inAppNotification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaService.inAppNotification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-123');

      expect(result).toEqual({ count: 5 });
      expect(mockPrismaService.inAppNotification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRead: false,
        },
      });
    });

    it('should return zero when no unread notifications', async () => {
      mockPrismaService.inAppNotification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-123');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.inAppNotification.update.mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead('user-123', 'notif-123');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockPrismaService.inAppNotification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should return notification as-is if already read', async () => {
      const alreadyReadNotif = {
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      };
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(alreadyReadNotif);

      const result = await service.markAsRead('user-123', 'notif-123');

      expect(result).toEqual(alreadyReadNotif);
      expect(mockPrismaService.inAppNotification.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-123', 'notif-999')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should not allow marking another user notification as read', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-999', 'notif-123')).rejects.toThrow(
        NotFoundException
      );

      expect(mockPrismaService.inAppNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notif-123',
          userId: 'user-999',
        },
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.inAppNotification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-123');

      expect(result).toEqual({ count: 3 });
      expect(mockPrismaService.inAppNotification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should return count of 0 if no unread notifications', async () => {
      mockPrismaService.inAppNotification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('user-123');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(mockNotification);
      mockPrismaService.inAppNotification.delete.mockResolvedValue(mockNotification);

      await service.deleteNotification('user-123', 'notif-123');

      expect(mockPrismaService.inAppNotification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('user-123', 'notif-999')
      ).rejects.toThrow(NotFoundException);
    });

    it('should not allow deleting another user notification', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteNotification('user-999', 'notif-123')
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.inAppNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notif-123',
          userId: 'user-999',
        },
      });
    });
  });

  describe('getById', () => {
    it('should return notification by id for a user', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(mockNotification);

      const result = await service.getById('user-123', 'notif-123');

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.inAppNotification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notif-123',
          userId: 'user-123',
        },
      });
    });

    it('should return null if notification not found', async () => {
      mockPrismaService.inAppNotification.findFirst.mockResolvedValue(null);

      const result = await service.getById('user-123', 'notif-999');

      expect(result).toBeNull();
    });
  });
});
