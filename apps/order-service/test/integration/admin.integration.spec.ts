import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CatalogClientService } from '../../src/modules/catalog-client/catalog-client.service';
import { DigitalOceanClientService } from '../../src/modules/provisioning/digitalocean-client.service';
import {
  createTestApp,
  TEST_INTERNAL_API_KEY,
} from '../helpers/test-app';
import {
  MOCK_PLAN_ID,
  MOCK_IMAGE_ID,
  createMockCatalogClientService,
} from '../helpers/mock-catalog-service';
import { createMockDigitalOceanClientService } from '../helpers/mock-digitalocean';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const isIntegrationTestEnabled = () => {
  return process.env.DATABASE_URL && process.env.RUN_INTEGRATION_TESTS === 'true';
};

const describeOrSkip = isIntegrationTestEnabled() ? describe : describe.skip;

describeOrSkip('Admin Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const USER_1 = 'user-admin-1';
  const USER_2 = 'user-admin-2';

  beforeAll(async () => {
    const mockCatalogService = createMockCatalogClientService();
    const mockDoService = createMockDigitalOceanClientService();

    const setup = await createTestApp({
      overrideProviders: [
        { provide: CatalogClientService, useValue: mockCatalogService },
        { provide: DigitalOceanClientService, useValue: mockDoService },
      ],
    });

    app = setup.app;
    prisma = setup.prisma;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.statusHistory.deleteMany({});
    await prisma.provisioningTask.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    jest.clearAllMocks();
  });

  describe('GET /internal/orders - Admin List Orders', () => {
    beforeEach(async () => {
      // Seed orders for different users and statuses
      await prisma.order.create({
        data: {
          userId: USER_1,
          planId: MOCK_PLAN_ID,
          planName: 'User 1 Active Order',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'ACTIVE',
          paidAt: new Date(),
        },
      });

      await prisma.order.create({
        data: {
          userId: USER_1,
          planId: MOCK_PLAN_ID,
          planName: 'User 1 Pending Order',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'PENDING_PAYMENT',
        },
      });

      await prisma.order.create({
        data: {
          userId: USER_2,
          planId: MOCK_PLAN_ID,
          planName: 'User 2 Active Order',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'QUARTERLY',
          basePrice: 270000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 270000,
          currency: 'IDR',
          status: 'ACTIVE',
          paidAt: new Date(),
        },
      });

      await prisma.order.create({
        data: {
          userId: USER_2,
          planId: MOCK_PLAN_ID,
          planName: 'User 2 Failed Order',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'FAILED',
        },
      });
    });

    it('should list all orders with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders?page=1&limit=10')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBe(4);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: 4,
        totalPages: 1,
      });
    });

    it('should filter orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders?status=ACTIVE')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((order: any) => {
        expect(order.status).toBe('ACTIVE');
      });
    });

    it('should filter orders by userId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/internal/orders?userId=${USER_1}`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((order: any) => {
        expect(order.userId).toBe(USER_1);
      });
    });

    it('should filter orders by both status and userId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/internal/orders?status=ACTIVE&userId=${USER_2}`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('ACTIVE');
      expect(response.body.data[0].userId).toBe(USER_2);
    });

    it('should paginate results correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders?page=1&limit=2')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 4,
        totalPages: 2,
      });
    });

    it('should return empty data for page beyond total', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders?page=100&limit=10')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.length).toBe(0);
      expect(response.body.meta.total).toBe(4);
    });
  });

  describe('GET /internal/orders/:id - Admin Get Order Detail', () => {
    it('should return order with full details including provisioningTask and statusHistory', async () => {
      // Create order with provisioning task and history
      const order = await prisma.order.create({
        data: {
          userId: USER_1,
          planId: MOCK_PLAN_ID,
          planName: 'Test Plan',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'ACTIVE',
          paidAt: new Date(),
        },
      });

      // Create provisioning task
      await prisma.provisioningTask.create({
        data: {
          orderId: order.id,
          status: 'SUCCESS',
          dropletId: '12345678',
          dropletName: `vps-${order.id.substring(0, 8)}`,
          dropletStatus: 'active',
          ipv4Public: '143.198.123.45',
          ipv4Private: '10.130.0.2',
          doRegion: 'sgp1',
          doSize: 's-1vcpu-1gb',
          doImage: 'ubuntu-22-04-x64',
          dropletTags: ['webrana'],
          dropletCreatedAt: new Date(),
          attempts: 3,
          startedAt: new Date(Date.now() - 60000),
          completedAt: new Date(),
        },
      });

      // Create status history
      await prisma.statusHistory.createMany({
        data: [
          {
            orderId: order.id,
            previousStatus: '',
            newStatus: 'PENDING_PAYMENT',
            actor: 'system',
            reason: 'Order created',
          },
          {
            orderId: order.id,
            previousStatus: 'PENDING_PAYMENT',
            newStatus: 'PAID',
            actor: 'admin:test',
            reason: 'Payment verified',
          },
          {
            orderId: order.id,
            previousStatus: 'PAID',
            newStatus: 'PROVISIONING',
            actor: 'system',
            reason: 'Provisioning started',
          },
          {
            orderId: order.id,
            previousStatus: 'PROVISIONING',
            newStatus: 'ACTIVE',
            actor: 'system',
            reason: 'Droplet provisioned successfully',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/internal/orders/${order.id}`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      const data = response.body.data;

      // Verify order fields
      expect(data.id).toBe(order.id);
      expect(data.userId).toBe(USER_1);
      expect(data.status).toBe('ACTIVE');
      expect(data.pricing).toBeDefined();
      expect(data.pricing.finalPrice).toBe(100000);
      expect(data.pricing.currency).toBe('IDR');

      // Verify provisioning task
      expect(data.provisioningTask).toBeDefined();
      expect(data.provisioningTask.status).toBe('SUCCESS');
      expect(data.provisioningTask.dropletId).toBe('12345678');
      expect(data.provisioningTask.ipv4Public).toBe('143.198.123.45');
      expect(data.provisioningTask.doRegion).toBe('sgp1');

      // Verify status history
      expect(data.statusHistory).toBeDefined();
      expect(data.statusHistory.length).toBe(4);
      const statuses = data.statusHistory.map((h: any) => h.newStatus);
      expect(statuses).toEqual(['PENDING_PAYMENT', 'PAID', 'PROVISIONING', 'ACTIVE']);
    });

    it('should return 404 for non-existent order', async () => {
      // Use valid UUID v4 format for non-existent order
      const fakeOrderId = '12345678-1234-4234-8234-123456789abc';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/internal/orders/${fakeOrderId}`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should allow admin to view any user order (no ownership check)', async () => {
      // Create order for USER_1
      const order = await prisma.order.create({
        data: {
          userId: USER_1,
          planId: MOCK_PLAN_ID,
          planName: 'Test Plan',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'PENDING_PAYMENT',
        },
      });

      // Admin can access any user's order
      const response = await request(app.getHttpServer())
        .get(`/api/v1/internal/orders/${order.id}`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body.data.id).toBe(order.id);
      expect(response.body.data.userId).toBe(USER_1);
    });
  });

  describe('Admin API Authentication', () => {
    it('should return 401/403 for missing API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders')
        .expect((res) => {
          expect([401, 403]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401/403 for invalid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders')
        .set('X-API-Key', 'invalid-api-key')
        .expect((res) => {
          expect([401, 403]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('error');
    });

    it('should accept valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/internal/orders')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });
});
