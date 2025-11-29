import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CatalogClientService } from '../../src/modules/catalog-client/catalog-client.service';
import { DigitalOceanClientService } from '../../src/modules/provisioning/digitalocean-client.service';
import { ProvisioningService } from '../../src/modules/provisioning/provisioning.service';
import {
  createTestApp,
  TEST_USER_ID,
  TEST_INTERNAL_API_KEY,
} from '../helpers/test-app';
import {
  MOCK_PLAN_ID,
  MOCK_IMAGE_ID,
  createMockCatalogClientService,
  mockPlanResponse,
  mockImageResponse,
} from '../helpers/mock-catalog-service';
import {
  createMockDigitalOceanClientService,
  MOCK_DROPLET_ID,
  MOCK_DROPLET_IPV4_PUBLIC,
  MOCK_DROPLET_IPV4_PRIVATE,
  MOCK_DO_REGION,
} from '../helpers/mock-digitalocean';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const isIntegrationTestEnabled = () => {
  return process.env.DATABASE_URL && process.env.RUN_INTEGRATION_TESTS === 'true';
};

const describeOrSkip = isIntegrationTestEnabled() ? describe : describe.skip;

describeOrSkip('Provisioning Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let provisioningService: ProvisioningService;
  let mockCatalogService: ReturnType<typeof createMockCatalogClientService>;
  let mockDoService: ReturnType<typeof createMockDigitalOceanClientService>;

  beforeAll(async () => {
    mockCatalogService = createMockCatalogClientService();

    // Set faster polling for tests
    process.env.PROVISIONING_POLL_INTERVAL_MS = '100';
    process.env.PROVISIONING_MAX_ATTEMPTS = '5';
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const setupProvisioningTestApp = async (doMock: ReturnType<typeof createMockDigitalOceanClientService>) => {
    const setup = await createTestApp({
      overrideProviders: [
        { provide: CatalogClientService, useValue: mockCatalogService },
        { provide: DigitalOceanClientService, useValue: doMock },
      ],
    });

    return {
      app: setup.app,
      prisma: setup.prisma,
      provisioningService: setup.app.get<ProvisioningService>(ProvisioningService),
    };
  };

  describe('Full Provisioning Flow - Success', () => {
    beforeEach(async () => {
      // Create mock that returns active after 2 polls
      mockDoService = createMockDigitalOceanClientService({
        finalStatus: 'active',
        pollsBeforeActive: 2,
      });

      const testContext = await setupProvisioningTestApp(mockDoService);
      app = testContext.app;
      prisma = testContext.prisma;
      provisioningService = testContext.provisioningService;

      // Clean up
      await prisma.statusHistory.deleteMany({});
      await prisma.provisioningTask.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
    });

    it('should transition order from PENDING_PAYMENT -> PAID -> PROVISIONING -> ACTIVE', async () => {
      // 1. Create order with PENDING_PAYMENT status
      const order = await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: mockPlanResponse.name,
          imageId: MOCK_IMAGE_ID,
          imageName: mockImageResponse.displayName,
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'PENDING_PAYMENT',
        },
      });

      // Record initial status
      await prisma.statusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: '',
          newStatus: 'PENDING_PAYMENT',
          actor: 'system',
          reason: 'Order created',
        },
      });

      // 2. Mark as PAID (triggers provisioning asynchronously)
      const paymentResponse = await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({ status: 'PAID', notes: 'Test payment' })
        .expect(200);

      expect(paymentResponse.body.data.status).toBe('PAID');

      // 3. Wait for provisioning to complete (with timeout)
      const maxWait = 5000; // 5 seconds
      const pollInterval = 200;
      let elapsed = 0;
      let finalOrder;

      while (elapsed < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;

        finalOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { provisioningTask: true },
        });

        if (finalOrder?.status === 'ACTIVE' || finalOrder?.status === 'FAILED') {
          break;
        }
      }

      // 4. Verify final state
      expect(finalOrder).toBeDefined();
      expect(finalOrder?.status).toBe('ACTIVE');
      expect(finalOrder?.provisioningTask).toBeDefined();
      expect(finalOrder?.provisioningTask?.status).toBe('SUCCESS');
      expect(finalOrder?.provisioningTask?.dropletId).toBe(MOCK_DROPLET_ID);
      expect(finalOrder?.provisioningTask?.ipv4Public).toBe(MOCK_DROPLET_IPV4_PUBLIC);
      expect(finalOrder?.provisioningTask?.ipv4Private).toBe(MOCK_DROPLET_IPV4_PRIVATE);
      expect(finalOrder?.provisioningTask?.doRegion).toBe(MOCK_DO_REGION);

      // 5. Verify status history
      const history = await prisma.statusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });

      const statuses = history.map((h) => h.newStatus);
      expect(statuses).toContain('PENDING_PAYMENT');
      expect(statuses).toContain('PAID');
      expect(statuses).toContain('PROVISIONING');
      expect(statuses).toContain('ACTIVE');
    });
  });

  describe('Provisioning Failure - Droplet Error', () => {
    beforeEach(async () => {
      // Create mock that returns errored status
      mockDoService = createMockDigitalOceanClientService({
        finalStatus: 'errored',
      });

      const testContext = await setupProvisioningTestApp(mockDoService);
      app = testContext.app;
      prisma = testContext.prisma;
      provisioningService = testContext.provisioningService;

      // Clean up
      await prisma.statusHistory.deleteMany({});
      await prisma.provisioningTask.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
    });

    it('should set order to FAILED when droplet enters errored state', async () => {
      // 1. Create order
      const order = await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: mockPlanResponse.name,
          imageId: MOCK_IMAGE_ID,
          imageName: mockImageResponse.displayName,
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'PENDING_PAYMENT',
        },
      });

      await prisma.statusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: '',
          newStatus: 'PENDING_PAYMENT',
          actor: 'system',
          reason: 'Order created',
        },
      });

      // 2. Mark as PAID
      await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({ status: 'PAID', notes: 'Test payment' })
        .expect(200);

      // 3. Wait for provisioning
      const maxWait = 5000;
      const pollInterval = 200;
      let elapsed = 0;
      let finalOrder;

      while (elapsed < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;

        finalOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { provisioningTask: true },
        });

        if (finalOrder?.status === 'ACTIVE' || finalOrder?.status === 'FAILED') {
          break;
        }
      }

      // 4. Verify failure state
      expect(finalOrder).toBeDefined();
      expect(finalOrder?.status).toBe('FAILED');
      expect(finalOrder?.provisioningTask?.status).toBe('FAILED');
      expect(finalOrder?.provisioningTask?.errorCode).toBe('DROPLET_ERRORED');

      // 5. Verify history includes FAILED transition
      const history = await prisma.statusHistory.findMany({
        where: { orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });

      const statuses = history.map((h) => h.newStatus);
      expect(statuses).toContain('FAILED');
    });
  });

  describe('Provisioning Timeout', () => {
    beforeEach(async () => {
      // Create mock that always returns "new" (never becomes active)
      mockDoService = createMockDigitalOceanClientService({
        finalStatus: 'new', // Never becomes active
      });

      // Override max attempts to be very low for timeout test
      process.env.PROVISIONING_MAX_ATTEMPTS = '2';

      const testContext = await setupProvisioningTestApp(mockDoService);
      app = testContext.app;
      prisma = testContext.prisma;
      provisioningService = testContext.provisioningService;

      // Clean up
      await prisma.statusHistory.deleteMany({});
      await prisma.provisioningTask.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
    });

    afterEach(() => {
      // Reset to default
      process.env.PROVISIONING_MAX_ATTEMPTS = '60';
    });

    it('should set order to FAILED after max polling attempts', async () => {
      // 1. Create order
      const order = await prisma.order.create({
        data: {
          userId: TEST_USER_ID,
          planId: MOCK_PLAN_ID,
          planName: mockPlanResponse.name,
          imageId: MOCK_IMAGE_ID,
          imageName: mockImageResponse.displayName,
          duration: 'MONTHLY',
          basePrice: 100000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 100000,
          currency: 'IDR',
          status: 'PENDING_PAYMENT',
        },
      });

      await prisma.statusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: '',
          newStatus: 'PENDING_PAYMENT',
          actor: 'system',
          reason: 'Order created',
        },
      });

      // 2. Mark as PAID
      await request(app.getHttpServer())
        .post(`/api/v1/internal/orders/${order.id}/payment-status`)
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send({ status: 'PAID', notes: 'Test payment' })
        .expect(200);

      // 3. Wait for provisioning to timeout
      const maxWait = 5000;
      const pollInterval = 200;
      let elapsed = 0;
      let finalOrder;

      while (elapsed < maxWait) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        elapsed += pollInterval;

        finalOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: { provisioningTask: true },
        });

        if (finalOrder?.status === 'ACTIVE' || finalOrder?.status === 'FAILED') {
          break;
        }
      }

      // 4. Verify timeout failure
      expect(finalOrder).toBeDefined();
      expect(finalOrder?.status).toBe('FAILED');
      expect(finalOrder?.provisioningTask?.status).toBe('FAILED');
      expect(finalOrder?.provisioningTask?.errorCode).toBe('PROVISIONING_TIMEOUT');
    });
  });
});
