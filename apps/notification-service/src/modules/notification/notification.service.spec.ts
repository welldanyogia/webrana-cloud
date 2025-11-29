import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthClientService } from '../auth-client/auth-client.service';
import { EmailService } from '../email/email.service';
import { TelegramService } from '../telegram/telegram.service';

import { NotificationEventType } from './dto/notification.dto';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let _prismaService: PrismaService;
  let _emailService: EmailService;
  let _telegramService: TelegramService;
  let _authClientService: AuthClientService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: AuthClientService, useValue: mockAuthClientService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _emailService = module.get<EmailService>(EmailService);
    _telegramService = module.get<TelegramService>(TelegramService);
    _authClientService = module.get<AuthClientService>(AuthClientService);
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
      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].channel).toBe('EMAIL');
      expect(result.notifications[0].status).toBe('SENT');

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
      expect(result.notifications).toHaveLength(2);

      const emailNotif = result.notifications.find((n) => n.channel === 'EMAIL');
      const telegramNotif = result.notifications.find((n) => n.channel === 'TELEGRAM');

      expect(emailNotif?.status).toBe('SENT');
      expect(telegramNotif?.status).toBe('SENT');

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

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].channel).toBe('EMAIL');
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

      expect(result.success).toBe(false);
      expect(result.notifications[0].status).toBe('SKIPPED');
      expect(result.notifications[0].error).toBe('User not found');
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

      expect(result.success).toBe(false);
      expect(result.notifications[0].status).toBe('FAILED');
      expect(result.notifications[0].error).toBe('SMTP connection failed');
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
  });
});
