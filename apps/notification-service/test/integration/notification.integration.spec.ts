import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AuthClientService } from '../../src/modules/auth-client/auth-client.service';
import { EmailService } from '../../src/modules/email/email.service';
import { QueueService } from '../../src/modules/queue/queue.service';
import { TelegramService } from '../../src/modules/telegram/telegram.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  createMockEmailService,
  createMockTelegramService,
  createMockAuthClientService,
  createMockUserInfo,
} from '../helpers/mock-services';
import {
  createTestApp,
  TEST_INTERNAL_API_KEY,
  TEST_USER_ID,
} from '../helpers/test-app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  isDockerAvailable,
} from '../helpers/test-database';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(runIntegrationTests ? describe : describe.skip)('Notification Flow Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockEmailService: ReturnType<typeof createMockEmailService>;
  let mockTelegramService: ReturnType<typeof createMockTelegramService>;
  let mockAuthClientService: ReturnType<typeof createMockAuthClientService>;
  let dockerAvailable = false;

  const userWithTelegram = createMockUserInfo(TEST_USER_ID, {
    name: 'Test User',
    email: 'test@example.com',
    telegramChatId: 'test-chat-id-fixture',
  });

  const userWithoutTelegram = createMockUserInfo('user-no-telegram', {
    name: 'No Telegram User',
    email: 'notelegram@example.com',
    telegramChatId: null,
  });

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      return;
    }

    // Setup test database
    await setupTestDatabase();

    // Create mock services
    mockEmailService = createMockEmailService();
    mockTelegramService = createMockTelegramService();

    // Create auth client mock with user data
    const userMap = new Map();
    userMap.set(TEST_USER_ID, userWithTelegram);
    userMap.set('user-no-telegram', userWithoutTelegram);
    mockAuthClientService = createMockAuthClientService(userMap);

    // Disable queue for synchronous testing
    const mockQueueService = {
      isQueueAvailable: jest.fn().mockReturnValue(false),
      addJob: jest.fn().mockResolvedValue(null),
    };

    // Create test app with mocked services
    const setup = await createTestApp({
      overrideProviders: [
        { provide: EmailService, useValue: mockEmailService },
        { provide: TelegramService, useValue: mockTelegramService },
        { provide: AuthClientService, useValue: mockAuthClientService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    });

    app = setup.app;
    prisma = setup.prisma;
  }, 180000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dockerAvailable) {
      await teardownTestDatabase();
    }
  });

  beforeEach(async () => {
    if (!dockerAvailable) return;

    // Clean up test data before each test
    await prisma.notificationLog.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Order Created Notification', () => {
    it('should send order confirmation email', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'ORDER_CREATED',
          userId: TEST_USER_ID,
          data: {
            orderNumber: 'ORD-20240101-001',
            planName: 'VPS Basic 1GB',
            duration: 1,
            durationUnit: 'month',
            basePrice: 150000,
            discount: 0,
            finalPrice: 150000,
            invoiceUrl: 'https://example.com/invoice/123',
          },
        })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.success).toBe(true);
      expect(response.body.data.message).toContain('notifications sent');

      // Verify email was sent
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: userWithTelegram.email,
          subject: expect.stringContaining('Order'),
        })
      );

      // Verify notification log created
      const logs = await prisma.notificationLog.findMany({
        where: { userId: TEST_USER_ID },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].event).toBe('ORDER_CREATED');
      expect(logs[0].channel).toBe('EMAIL');
      expect(logs[0].status).toBe('SENT');
    });
  });

  describe('Payment Confirmed Notification', () => {
    it('should send payment success notification (email + telegram)', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'PAYMENT_CONFIRMED',
          userId: TEST_USER_ID,
          data: {
            orderNumber: 'ORD-20240101-001',
            planName: 'VPS Basic 1GB',
            amount: 150000,
            paymentMethod: 'BRI Virtual Account',
            paidAt: new Date().toISOString(),
          },
        })
        .expect(200);

      expect(response.body.data.success).toBe(true);

      // Verify email was sent
      expect(mockEmailService.sendEmail).toHaveBeenCalled();

      // Verify Telegram was sent (user has telegram)
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          chatId: userWithTelegram.telegramChatId,
        })
      );

      // Verify notification logs
      const logs = await prisma.notificationLog.findMany({
        where: { userId: TEST_USER_ID },
        orderBy: { createdAt: 'asc' },
      });
      expect(logs.length).toBe(2); // Email + Telegram
      expect(logs.map((l) => l.channel).sort()).toEqual(['EMAIL', 'TELEGRAM']);
    });

    it('should send only email if user has no telegram', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'PAYMENT_CONFIRMED',
          userId: 'user-no-telegram',
          data: {
            orderNumber: 'ORD-20240101-002',
            planName: 'VPS Pro 2GB',
            amount: 300000,
            paymentMethod: 'QRIS',
            paidAt: new Date().toISOString(),
          },
        })
        .expect(200);

      expect(response.body.data.success).toBe(true);

      // Verify email was sent
      expect(mockEmailService.sendEmail).toHaveBeenCalled();

      // Telegram should NOT be called (no chatId)
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();

      // Only email log should exist
      const logs = await prisma.notificationLog.findMany({
        where: { userId: 'user-no-telegram' },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].channel).toBe('EMAIL');
    });
  });

  describe('VPS Active Notification', () => {
    it('should send VPS activation notification with credentials', async () => {
      if (!dockerAvailable) return;

      const vpsData = {
        orderNumber: 'ORD-20240101-001',
        planName: 'VPS Basic 1GB',
        ipAddress: '103.123.45.67',
        hostname: 'vps-abc123',
        username: 'root',
        credential: 'MOCK-CREDENTIAL-VALUE', // Test fixture value
        osName: 'Ubuntu 22.04 LTS',
        region: 'Singapore',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'VPS_ACTIVE',
          userId: TEST_USER_ID,
          data: vpsData,
        })
        .expect(200);

      expect(response.body.data.success).toBe(true);

      // Verify email contains credentials
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(vpsData.ipAddress),
        })
      );

      // Verify Telegram was sent
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();

      // Verify logs
      const logs = await prisma.notificationLog.findMany({
        where: { userId: TEST_USER_ID, event: 'VPS_ACTIVE' },
      });
      expect(logs.length).toBe(2);
    });
  });

  describe('Provisioning Failed Notification', () => {
    it('should send provisioning failure notification', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'PROVISIONING_FAILED',
          userId: TEST_USER_ID,
          data: {
            orderNumber: 'ORD-20240101-003',
            planName: 'VPS Basic 1GB',
            errorMessage: 'DigitalOcean API unavailable',
            supportEmail: 'support@webrana.cloud',
          },
        })
        .expect(200);

      expect(response.body.data.success).toBe(true);

      // Verify both channels notified
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();

      // Verify logs
      const logs = await prisma.notificationLog.findMany({
        where: { userId: TEST_USER_ID, event: 'PROVISIONING_FAILED' },
      });
      expect(logs.length).toBe(2);
    });
  });

  describe('Invalid Notification Event', () => {
    it('should reject invalid notification event', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          event: 'INVALID_EVENT',
          userId: TEST_USER_ID,
          data: {},
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Notification Logs', () => {
    it('should list notification logs with pagination', async () => {
      if (!dockerAvailable) return;

      // Create some notifications first
      for (let i = 0; i < 5; i++) {
        await prisma.notificationLog.create({
          data: {
            userId: TEST_USER_ID,
            event: 'ORDER_CREATED',
            channel: 'EMAIL',
            status: 'SENT',
            recipient: 'test@example.com',
            content: `Test notification ${i}`,
            sentAt: new Date(),
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/notifications/logs?page=1&limit=2')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.total).toBe(5);
      expect(response.body.meta.totalPages).toBe(3);
    });

    it('should filter notification logs by status', async () => {
      if (!dockerAvailable) return;

      // Create notifications with different statuses
      await prisma.notificationLog.create({
        data: {
          userId: TEST_USER_ID,
          event: 'ORDER_CREATED',
          channel: 'EMAIL',
          status: 'SENT',
          recipient: 'test@example.com',
          content: 'Sent notification',
          sentAt: new Date(),
        },
      });

      await prisma.notificationLog.create({
        data: {
          userId: TEST_USER_ID,
          event: 'ORDER_CREATED',
          channel: 'EMAIL',
          status: 'FAILED',
          recipient: 'test@example.com',
          content: 'Failed notification',
          error: 'SMTP error',
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/notifications/logs?status=SENT')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('SENT');
    });
  });

  describe('Available Templates', () => {
    it('should return list of available notification templates', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/notifications/templates')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify structure
      const template = response.body.data[0];
      expect(template.event).toBeDefined();
      expect(template.channels).toBeDefined();
      expect(template.description).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .send({
          event: 'ORDER_CREATED',
          userId: TEST_USER_ID,
          data: {},
        })
        .expect(401);
    });

    it('should reject requests with invalid API key', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .post('/api/v1/internal/notifications/send')
        .set('X-API-Key', 'invalid-key')
        .send({
          event: 'ORDER_CREATED',
          userId: TEST_USER_ID,
          data: {},
        })
        .expect(401);
    });
  });
});
