import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthClientService } from '../auth-client/auth-client.service';
import { EmailService } from '../email/email.service';
import { QueueService } from '../queue/queue.service';
import { TelegramService } from '../telegram/telegram.service';
import { UserNotificationService } from '../user-notification/user-notification.service';
import { WebsocketService } from '../websocket/websocket.service';

import { NotificationEventType } from './dto/notification.dto';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let _prismaService: PrismaService;
  let _emailService: EmailService;
  let _telegramService: TelegramService;
  let _authClientService: AuthClientService;
  let _queueService: QueueService;

  const mockPrismaService = {
    notificationLog: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    isEmailConfigured: jest.fn().mockReturnValue(true),
  };

  const mockTelegramService = {
    sendMessage: jest.fn(),
    isTelegramConfigured: jest.fn().mockReturnValue(true),
  };

  const mockAuthClientService = {
    getUserById: jest.fn(),
  };

  const mockQueueService = {
    isQueueAvailable: jest.fn().mockReturnValue(false),
    addJob: jest.fn().mockResolvedValue(null),
  };

  const mockUserNotificationService = {
    create: jest.fn().mockResolvedValue({
      id: 'notif-123',
      userId: 'user-123',
      title: 'Test Notification',
      message: 'Test message',
      type: 'ORDER_CREATED',
      isRead: false,
      createdAt: new Date(),
    }),
    getNotifications: jest.fn().mockResolvedValue([]),
    getUnreadCount: jest.fn().mockResolvedValue({ count: 1 }),
    markAsRead: jest.fn().mockResolvedValue(undefined),
  };

  const mockWebsocketService = {
    sendToUser: jest.fn(),
    broadcastToAll: jest.fn(),
    pushNotification: jest.fn().mockResolvedValue(true),
    updateUnreadCount: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: AuthClientService, useValue: mockAuthClientService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: UserNotificationService, useValue: mockUserNotificationService },
        { provide: WebsocketService, useValue: mockWebsocketService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _emailService = module.get<EmailService>(EmailService);
    _telegramService = module.get<TelegramService>(TelegramService);
    _authClientService = module.get<AuthClientService>(AuthClientService);
    _queueService = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notify', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: '123456789',
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'ORDER_CREATED',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should send ORDER_CREATED notification via email only', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(2); // EMAIL + IN_APP

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('SENT');
      expect(inAppNotif?.status).toBe('SENT');

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('should send PAYMENT_CONFIRMED notification via email and telegram', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
      mockTelegramService.sendMessage.mockResolvedValue({ success: true, messageId: 123 });

      const result = await service.notify(
        NotificationEventType.PAYMENT_CONFIRMED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          amount: 150000,
          paymentMethod: 'BCA VA',
          paidAt: '2024-01-15 10:30:00',
        }
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(3); // EMAIL + TELEGRAM + IN_APP

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('SENT');
      expect(telegramNotif?.status).toBe('SENT');
      expect(inAppNotif?.status).toBe('SENT');

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should skip telegram if user has no chatId', async () => {
      mockAuthClientService.getUserById.mockResolvedValue({
        ...mockUser,
        telegramChatId: undefined,
      });
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.PAYMENT_CONFIRMED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          amount: 150000,
          paymentMethod: 'BCA VA',
          paidAt: '2024-01-15 10:30:00',
        }
      );

      expect(result.notifications).toHaveLength(2); // EMAIL + IN_APP
      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      expect(emailNotif?.channel).toBe('EMAIL');
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      mockAuthClientService.getUserById.mockRejectedValue(new Error('User not found'));

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'unknown-user',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      // success is true because IN_APP notification still succeeds even when user lookup fails
      expect(result.success).toBe(true);
      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      expect(emailNotif?.status).toBe('SKIPPED');
      expect(emailNotif?.error).toBe('User not found');
    });

    it('should throw InvalidNotificationEventException for unknown event', async () => {
      await expect(
        service.notify('UNKNOWN_EVENT' as NotificationEventType, 'user-123', {})
      ).rejects.toThrow('Event notification tidak valid');
    });

    it('should handle email send failure', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SMTP connection failed',
      });

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      // success is true because IN_APP notification still succeeds even when email fails
      expect(result.success).toBe(true);
      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      expect(emailNotif?.status).toBe('FAILED');
      expect(emailNotif?.error).toBe('SMTP connection failed');
    });
  });

  describe('getNotificationLogs', () => {
    const mockLogs = [
      {
        id: 'log-1',
        userId: 'user-123',
        event: 'ORDER_CREATED',
        channel: 'EMAIL',
        status: 'SENT',
        recipient: 'test@example.com',
        subject: 'Test',
        content: 'Test',
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return paginated notification logs', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(1);

      const result = await service.getNotificationLogs({
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter logs by userId', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(1);

      await service.getNotificationLogs({
        page: 1,
        limit: 20,
        userId: 'user-123',
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-123' }),
        })
      );
    });

    it('should filter logs by event', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(1);

      await service.getNotificationLogs({
        page: 1,
        limit: 20,
        event: 'ORDER_CREATED',
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ event: 'ORDER_CREATED' }),
        })
      );
    });

    it('should filter logs by channel', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(1);

      await service.getNotificationLogs({
        page: 1,
        limit: 20,
        channel: 'EMAIL',
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ channel: 'EMAIL' }),
        })
      );
    });

    it('should filter logs by status', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(1);

      await service.getNotificationLogs({
        page: 1,
        limit: 20,
        status: 'SENT',
      });

      expect(mockPrismaService.notificationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'SENT' }),
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.notificationLog.count.mockResolvedValue(45);

      const result = await service.getNotificationLogs({
        page: 1,
        limit: 10,
      });

      expect(result.meta.totalPages).toBe(5);
    });

    it('should use default pagination values', async () => {
      mockPrismaService.notificationLog.findMany.mockResolvedValue([]);
      mockPrismaService.notificationLog.count.mockResolvedValue(0);

      const result = await service.getNotificationLogs({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });
  });

  describe('notify - VPS_ACTIVE event', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: '123456789',
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'VPS_ACTIVE',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should send VPS_ACTIVE notification via email and telegram', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
      mockTelegramService.sendMessage.mockResolvedValue({ success: true, messageId: 123 });

      const result = await service.notify(
        NotificationEventType.VPS_ACTIVE,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          ipAddress: '192.168.1.100',
          hostname: 'vps-001.webrana.cloud',
          username: 'root',
          password: 'secret123',
          osName: 'Ubuntu 22.04',
          region: 'Singapore',
          expiresAt: '2024-02-15',
        }
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(3); // EMAIL + TELEGRAM + IN_APP

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('SENT');
      expect(telegramNotif?.status).toBe('SENT');
      expect(inAppNotif?.status).toBe('SENT');

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should skip telegram for VPS_ACTIVE if user has no chatId', async () => {
      mockAuthClientService.getUserById.mockResolvedValue({
        ...mockUser,
        telegramChatId: null,
      });
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.VPS_ACTIVE,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          ipAddress: '192.168.1.100',
          hostname: 'vps-001.webrana.cloud',
          username: 'root',
          password: 'secret123',
          osName: 'Ubuntu 22.04',
          region: 'Singapore',
          expiresAt: '2024-02-15',
        }
      );

      expect(result.notifications).toHaveLength(2); // EMAIL + IN_APP
      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      expect(emailNotif?.channel).toBe('EMAIL');
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('notify - PROVISIONING_FAILED event', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: '123456789',
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'PROVISIONING_FAILED',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should send PROVISIONING_FAILED notification via email and telegram', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
      mockTelegramService.sendMessage.mockResolvedValue({ success: true, messageId: 123 });

      const result = await service.notify(
        NotificationEventType.PROVISIONING_FAILED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          errorMessage: 'Insufficient capacity in region',
          supportEmail: 'support@webrana.cloud',
        }
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(3); // EMAIL + TELEGRAM + IN_APP

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('SENT');
      expect(telegramNotif?.status).toBe('SENT');
      expect(inAppNotif?.status).toBe('SENT');

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should skip telegram for PROVISIONING_FAILED if user has no chatId', async () => {
      mockAuthClientService.getUserById.mockResolvedValue({
        ...mockUser,
        telegramChatId: undefined,
      });
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.PROVISIONING_FAILED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          errorMessage: 'Insufficient capacity in region',
          supportEmail: 'support@webrana.cloud',
        }
      );

      expect(result.notifications).toHaveLength(2); // EMAIL + IN_APP
      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      expect(emailNotif?.channel).toBe('EMAIL');
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('notify - telegram failure handling', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: '123456789',
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'PAYMENT_CONFIRMED',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should handle telegram send failure while email succeeds', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });
      mockTelegramService.sendMessage.mockResolvedValue({
        success: false,
        error: 'Bot blocked by user',
      });

      const result = await service.notify(
        NotificationEventType.PAYMENT_CONFIRMED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          amount: 150000,
          paymentMethod: 'BCA VA',
          paidAt: '2024-01-15 10:30:00',
        }
      );

      expect(result.success).toBe(true);
      expect(result.notifications).toHaveLength(3); // EMAIL + TELEGRAM + IN_APP

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('SENT');
      expect(telegramNotif?.status).toBe('FAILED');
      expect(telegramNotif?.error).toBe('Bot blocked by user');
      expect(inAppNotif?.status).toBe('SENT');
    });

    it('should report failure when both email and telegram fail', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error',
      });
      mockTelegramService.sendMessage.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const result = await service.notify(
        NotificationEventType.PAYMENT_CONFIRMED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          amount: 150000,
          paymentMethod: 'BCA VA',
          paidAt: '2024-01-15 10:30:00',
        }
      );

      // success is true because IN_APP notification still succeeds even when email and telegram fail
      expect(result.success).toBe(true);
      expect(result.message).toContain('1/3'); // Only IN_APP succeeded

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');
      const inAppNotif = result.notifications.find((n) => n.channel === 'IN_APP');

      expect(emailNotif?.status).toBe('FAILED');
      expect(telegramNotif?.status).toBe('FAILED');
      expect(inAppNotif?.status).toBe('SENT');
    });
  });

  describe('notify - queue behavior', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: null,
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'ORDER_CREATED',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should queue notification when queue is available', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockQueueService.addJob.mockResolvedValue('job-123');

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('queued');
      expect(result.notifications[0].status).toBe('QUEUED');
      expect(result.notifications[0].jobId).toBe('job-123');
      expect(mockQueueService.addJob).toHaveBeenCalled();
    });

    it('should process synchronously when sync option is true', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        },
        { sync: true }
      );

      expect(result.notifications[0].status).toBe('SENT');
      expect(mockQueueService.addJob).not.toHaveBeenCalled();
    });

    it('should fallback to sync when queue addJob returns null', async () => {
      mockQueueService.isQueueAvailable.mockReturnValue(true);
      mockQueueService.addJob.mockResolvedValue(null);
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      const result = await service.notify(
        NotificationEventType.ORDER_CREATED,
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      expect(result.notifications[0].status).toBe('SENT');
    });
  });

  describe('processNotificationJob', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: null,
    };

    const mockLog = {
      id: 'log-123',
      userId: 'user-123',
      event: 'ORDER_CREATED',
      channel: 'EMAIL',
      status: 'QUEUED',
      recipient: 'test@example.com',
      subject: 'Test Subject',
      content: '<p>Test</p>',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAuthClientService.getUserById.mockResolvedValue(mockUser);
      mockPrismaService.notificationLog.create.mockResolvedValue(mockLog);
      mockPrismaService.notificationLog.update.mockResolvedValue({
        ...mockLog,
        status: 'SENT',
      });
    });

    it('should process notification job from queue', async () => {
      mockEmailService.sendEmail.mockResolvedValue({ success: true, messageId: 'msg-1' });

      await service.processNotificationJob(
        'ORDER_CREATED',
        'user-123',
        {
          orderNumber: 'ORD-001',
          planName: 'VPS Basic',
          duration: 1,
          durationUnit: 'month',
          basePrice: 150000,
          finalPrice: 150000,
        }
      );

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });
});
