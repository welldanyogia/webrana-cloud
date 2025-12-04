import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { CatalogClientService } from '../../src/modules/catalog-client/catalog-client.service';
import { DigitalOceanClientService } from '../../src/modules/provisioning/digitalocean-client.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  MOCK_PLAN_ID,
  MOCK_IMAGE_ID,
  MOCK_VALID_COUPON,
  MOCK_INVALID_COUPON,
  createMockCatalogClientService,
} from '../helpers/mock-catalog-service';
import { createMockDigitalOceanClientService } from '../helpers/mock-digitalocean';
import {
  createTestApp,
  generateTestToken,
  TEST_USER_ID,
  TEST_INTERNAL_API_KEY,
} from '../helpers/test-app';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const isIntegrationTestEnabled = () => {
  return process.env.DATABASE_URL && process.env.RUN_INTEGRATION_TESTS === 'true';
};

const describeOrSkip = isIntegrationTestEnabled() ? describe : describe.skip;

describeOrSkip('Order Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const OTHER_USER_ID = 'other-user-456';

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
    token = generateTestToken(TEST_USER_ID);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.statusHistory.deleteMany({});
    await prisma.provisioningTask.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/v1/orders - Create Order', () => {
    it('should create order successfully with data envelope', async () => {
      const createOrderDto = {
        planId: MOCK_PLAN_ID,
        imageId: MOCK_IMAGE_ID,
        duration: 'MONTHLY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrderDto)
        .expect(201);

      // Verify response envelope
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        status: 'PENDING_PAYMENT',
        pricing: {
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
        },
      });
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.createdAt).toBeDefined();

      // Verify database record
      const order = await prisma.order.findUnique({
        where: { id: response.body.data.id },
      });
      expect(order).not.toBeNull();
      expect(order?.status).toBe('PENDING_PAYMENT');
      expect(order?.userId).toBe(TEST_USER_ID);
    });

    it('should create order with valid coupon and apply discount', async () => {
      const createOrderDto = {
        planId: MOCK_PLAN_ID,
        imageId: MOCK_IMAGE_ID,
        duration: 'MONTHLY',
        couponCode: MOCK_VALID_COUPON,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrderDto)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.pricing.couponDiscount).toBe(20000);
      expect(response.body.data.pricing.finalPrice).toBe(80000);
    });

    it('should return 400 INVALID_PLAN for non-existent plan', async () => {
      const createOrderDto = {
        // Use valid UUID v4 format for non-existent plan
        planId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        imageId: MOCK_IMAGE_ID,
        duration: 'MONTHLY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrderDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_PLAN');
    });

    it('should return 400 INVALID_IMAGE for non-existent image', async () => {
      const createOrderDto = {
        planId: MOCK_PLAN_ID,
        // Use valid UUID v4 format for non-existent image
        imageId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        duration: 'MONTHLY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrderDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_IMAGE');
    });

    it('should return 400 INVALID_COUPON for invalid coupon', async () => {
      const createOrderDto = {
        planId: MOCK_PLAN_ID,
        imageId: MOCK_IMAGE_ID,
        duration: 'MONTHLY',
        couponCode: MOCK_INVALID_COUPON,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send(createOrderDto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_COUPON');
    });

    it('should return 401 for missing JWT', async () => {
      const createOrderDto = {
        planId: MOCK_PLAN_ID,
        imageId: MOCK_IMAGE_ID,
        duration: 'MONTHLY',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(createOrderDto)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/orders/:id - Get Order by ID', () => {
    it('should return order with data envelope for owner', async () => {
      // Create order first
      const order = await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
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

      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.id).toBe(order.id);
      expect(response.body.data.status).toBe('PENDING_PAYMENT');
      expect(response.body.data.pricing).toBeDefined();
    });

    it('should return 403 ORDER_ACCESS_DENIED for non-owner', async () => {
      // Create order for TEST_USER_ID
      const order = await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
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

      // Try to access with OTHER_USER_ID
      const otherToken = generateTestToken(OTHER_USER_ID);
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${order.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ORDER_ACCESS_DENIED');
    });

    it('should return 404 ORDER_NOT_FOUND for non-existent order', async () => {
      // Use valid UUID v4 format for non-existent order
      const fakeOrderId = '12345678-1234-4234-8234-123456789abc';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${fakeOrderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('GET /api/v1/orders - List Orders with Pagination', () => {
    it('should return paginated orders with data and meta', async () => {
      // Create multiple orders
      for (let i = 0; i < 5; i++) {
        await prisma.order.create({
          data: {
            userId: TEST_USER_ID,
            planId: MOCK_PLAN_ID,
            planName: `Test Plan ${i}`,
            imageId: MOCK_IMAGE_ID,
            imageName: 'Test Image',
            duration: 'MONTHLY',
            basePrice: 100000,
            promoDiscount: 0,
            couponDiscount: 0,
            finalPrice: 100000,
            currency: 'IDR',
            status: i % 2 === 0 ? 'PENDING_PAYMENT' : 'ACTIVE',
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('should filter orders by status', async () => {
      // Create orders with different statuses
      await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: 'Active Order',
          imageId: MOCK_IMAGE_ID,
          imageName: 'Test Image',
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'ACTIVE',
        },
      });

      await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: 'Pending Order',
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

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders?status=ACTIVE')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('ACTIVE');
    });

    it('should only return orders belonging to the user', async () => {
      // Create order for TEST_USER_ID
      await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: 'My Order',
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

      // Create order for OTHER_USER_ID
      await prisma.order.create({
        data: {
          userId: OTHER_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: 'Other Order',
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

      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.total).toBe(1);
    });
  });
});
