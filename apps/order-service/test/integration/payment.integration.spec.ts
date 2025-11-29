import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CatalogClientService } from '../../src/modules/catalog-client/catalog-client.service';
import { DigitalOceanClientService } from '../../src/modules/provisioning/digitalocean-client.service';
import {
  createTestApp,
  TEST_USER_ID,
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

describeOrSkip('Payment Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  describe('POST /internal/orders/:id/payment-status - Update Payment Status', () => {
    it('should mark order as PAID successfully', async () => {
      // Create order with PENDING_PAYMENT status
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
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAID',
          notes: 'Manual verification completed',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.previousStatus).toBe('PENDING_PAYMENT');
      expect(response.body.data.paidAt).not.toBeNull();

      // Verify database update
      // Note: Status may be PAID or PROVISIONING depending on timing
      // because provisioning starts immediately after PAID
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(['PAID', 'PROVISIONING']).toContain(updatedOrder?.status);
      expect(updatedOrder?.paidAt).not.toBeNull();

      // Verify status history was recorded
      const history = await prisma.statusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(history.length).toBeGreaterThan(0);
      const paidHistory = history.find((h) => h.newStatus === 'PAID');
      expect(paidHistory).toBeDefined();
      expect(paidHistory?.previousStatus).toBe('PENDING_PAYMENT');
    });

    it('should return 409 PAYMENT_STATUS_CONFLICT when order is not PENDING_PAYMENT', async () => {
      // Create order with ACTIVE status
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
          status: 'ACTIVE',
          paidAt: new Date(),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAID',
          notes: 'Should fail',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('PAYMENT_STATUS_CONFLICT');
    });

    it('should record PAYMENT_FAILED as event without changing order status', async () => {
      // Create order with PENDING_PAYMENT status
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
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAYMENT_FAILED',
          notes: 'Gateway timeout',
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Order status remains PENDING_PAYMENT per v1 design
      expect(response.body.data.status).toBe('PENDING_PAYMENT');
      expect(response.body.data.paidAt).toBeNull();

      // Verify database - order status unchanged
      const updatedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrder?.status).toBe('PENDING_PAYMENT');

      // Verify PAYMENT_FAILED event was recorded in status history
      const history = await prisma.statusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });
      const failedEvent = history.find((h) => h.newStatus === 'PAYMENT_FAILED');
      expect(failedEvent).toBeDefined();
      expect(failedEvent?.previousStatus).toBe('PENDING_PAYMENT');
      expect(failedEvent?.reason).toBe('Gateway timeout');
    });

    it('should return 404 ORDER_NOT_FOUND for non-existent order', async () => {
      // Use valid UUID v4 format for non-existent order
      const fakeOrderId = '12345678-1234-4234-8234-123456789abc';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${fakeOrderId}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAID',
          notes: 'Should fail',
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('should return 401/403 for missing or invalid API key', async () => {
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

      // Missing API key
      const response1 = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .send({
          status: 'PAID',
          notes: 'Should fail',
        });

      expect([401, 403]).toContain(response1.status);
      expect(response1.body).toHaveProperty('error');

      // Invalid API key
      const response2 = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', 'invalid-key')
        .send({
          status: 'PAID',
          notes: 'Should fail',
        });

      expect([401, 403]).toContain(response2.status);
      expect(response2.body).toHaveProperty('error');
    });

    it('should allow retry after PAYMENT_FAILED', async () => {
      // Create order
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

      // First: Mark as PAYMENT_FAILED
      await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAYMENT_FAILED',
          notes: 'First attempt failed',
        })
        .expect(200);

      // Second: Retry and mark as PAID (should succeed because status is still PENDING_PAYMENT)
      const response = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({
          status: 'PAID',
          notes: 'Retry successful',
        })
        .expect(200);

      expect(response.body.data.status).toBe('PAID');
      expect(response.body.data.paidAt).not.toBeNull();

      // Verify history has both events
      const history = await prisma.statusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });
      const failedEvents = history.filter((h) => h.newStatus === 'PAYMENT_FAILED');
      const paidEvents = history.filter((h) => h.newStatus === 'PAID');
      expect(failedEvents.length).toBeGreaterThanOrEqual(1);
      expect(paidEvents.length).toBeGreaterThanOrEqual(1);
    });
  });
});
