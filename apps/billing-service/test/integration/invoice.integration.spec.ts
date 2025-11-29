import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TripayService } from '../../src/modules/tripay/tripay.service';
import { OrderClientService } from '../../src/modules/order-client/order-client.service';
import {
  setupTestDatabase,
  teardownTestDatabase,
  isDockerAvailable,
} from '../helpers/test-database';
import {
  createTestApp,
  generateTestToken,
  TEST_USER_ID,
  TEST_INTERNAL_API_KEY,
} from '../helpers/test-app';
import {
  createMockTripayService,
  createMockOrderClientService,
  MOCK_PAYMENT_CHANNELS,
} from '../helpers/mock-services';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(runIntegrationTests ? describe : describe.skip)('Invoice Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let mockTripayService: ReturnType<typeof createMockTripayService>;
  let mockOrderClientService: ReturnType<typeof createMockOrderClientService>;
  let dockerAvailable = false;

  const OTHER_USER_ID = 'other-user-456';
  const TEST_ORDER_ID = 'order-test-123';

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      return;
    }

    // Setup test database
    await setupTestDatabase();

    // Create mock services
    mockTripayService = createMockTripayService();
    mockOrderClientService = createMockOrderClientService();

    // Create test app with mocked services
    const setup = await createTestApp({
      overrideProviders: [
        { provide: TripayService, useValue: mockTripayService },
        { provide: OrderClientService, useValue: mockOrderClientService },
      ],
    });

    app = setup.app;
    prisma = setup.prisma;
    token = generateTestToken(TEST_USER_ID);
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
    await prisma.payment.deleteMany({});
    await prisma.invoice.deleteMany({});
    jest.clearAllMocks();
  });

  describe('Invoice Creation Flow', () => {
    it('should create invoice for valid order via internal API', async () => {
      if (!dockerAvailable) return;

      const createInvoiceDto = {
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        amount: 150000,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/billing/invoices')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send(createInvoiceDto)
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderId).toBe(TEST_ORDER_ID);
      expect(response.body.data.amount).toBe(150000);
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.invoiceNumber).toMatch(/^INV-\d{8}-[A-Z0-9]{6}$/);
      expect(response.body.data.expiredAt).toBeDefined();

      // Verify database record
      const invoice = await prisma.invoice.findUnique({
        where: { orderId: TEST_ORDER_ID },
      });
      expect(invoice).not.toBeNull();
      expect(invoice?.amount).toBe(150000);
      expect(invoice?.status).toBe('PENDING');
      expect(invoice?.userId).toBe(TEST_USER_ID);
    });

    it('should snapshot pricing at creation time', async () => {
      if (!dockerAvailable) return;

      const amount = 100000;
      const createInvoiceDto = {
        orderId: 'order-snapshot-test',
        userId: TEST_USER_ID,
        amount,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/billing/invoices')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send(createInvoiceDto)
        .expect(201);

      const invoiceId = response.body.data.id;

      // Verify the amount is stored correctly
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      expect(invoice?.amount).toBe(amount);
      expect(invoice?.currency).toBe('IDR');
    });

    it('should reject duplicate invoice for same order', async () => {
      if (!dockerAvailable) return;

      const createInvoiceDto = {
        orderId: 'order-duplicate-test',
        userId: TEST_USER_ID,
        amount: 150000,
      };

      // First creation should succeed
      await request(app.getHttpServer())
        .post('/api/v1/internal/billing/invoices')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send(createInvoiceDto)
        .expect(201);

      // Second creation should fail with conflict
      const response = await request(app.getHttpServer())
        .post('/api/v1/internal/billing/invoices')
        .set('X-API-Key', TEST_INTERNAL_API_KEY)
        .send(createInvoiceDto)
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVOICE_ALREADY_EXISTS');
    });
  });

  describe('Get Invoice', () => {
    it('should return invoice for owner', async () => {
      if (!dockerAvailable) return;

      // Create invoice first
      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-get-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-TEST01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${invoice.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(invoice.id);
      expect(response.body.data.invoiceNumber).toBe('INV-20240101-TEST01');
      expect(response.body.data.amount).toBe(150000);
    });

    it('should return 403 for non-owner', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-access-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-TEST02',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const otherToken = generateTestToken(OTHER_USER_ID);
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${invoice.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVOICE_ACCESS_DENIED');
    });

    it('should return 404 for non-existent invoice', async () => {
      if (!dockerAvailable) return;

      const fakeInvoiceId = '12345678-1234-4234-8234-123456789abc';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/${fakeInvoiceId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
    });
  });

  describe('List Invoices with Pagination', () => {
    it('should return paginated invoices for user', async () => {
      if (!dockerAvailable) return;

      // Create multiple invoices
      for (let i = 0; i < 5; i++) {
        await prisma.invoice.create({
          data: {
            orderId: `order-list-test-${i}`,
            userId: TEST_USER_ID,
            invoiceNumber: `INV-20240101-LIST${i.toString().padStart(2, '0')}`,
            amount: 100000 + i * 10000,
            expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('should filter invoices by status', async () => {
      if (!dockerAvailable) return;

      // Create invoices with different statuses
      await prisma.invoice.create({
        data: {
          orderId: 'order-filter-paid',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PAID01',
          amount: 150000,
          status: 'PAID',
          paidAt: new Date(),
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await prisma.invoice.create({
        data: {
          orderId: 'order-filter-pending',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PEND01',
          amount: 150000,
          status: 'PENDING',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices?status=PAID')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PAID');
    });

    it('should only return invoices belonging to the user', async () => {
      if (!dockerAvailable) return;

      // Create invoice for TEST_USER_ID
      await prisma.invoice.create({
        data: {
          orderId: 'order-my-invoice',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-MINE01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Create invoice for OTHER_USER_ID
      await prisma.invoice.create({
        data: {
          orderId: 'order-other-invoice',
          userId: OTHER_USER_ID,
          invoiceNumber: 'INV-20240101-OTHR01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].invoiceNumber).toBe('INV-20240101-MINE01');
    });
  });

  describe('Payment Initiation Flow', () => {
    it('should initiate payment with valid channel', async () => {
      if (!dockerAvailable) return;

      // Create pending invoice
      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-pay-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PAY001',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.invoice).toBeDefined();
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.payment.channel).toBe('BRIVA');
      expect(response.body.data.payment.paymentCode).toBeDefined();
      expect(response.body.data.payment.paymentUrl).toBeDefined();

      // Verify Tripay was called
      expect(mockTripayService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'BRIVA',
          amount: 150000,
        })
      );

      // Verify invoice updated with payment details
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentMethod).toBe('VIRTUAL_ACCOUNT');
      expect(updatedInvoice?.paymentChannel).toBe('BRI_VA');
      expect(updatedInvoice?.tripayReference).toBeDefined();
    });

    it('should calculate fees correctly', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-fee-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-FEE001',
          amount: 100000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      // BRIVA has flat fee of 4000
      expect(response.body.data.payment.fee).toBe(4000);
      expect(response.body.data.payment.totalAmount).toBe(104000);
    });

    it('should reject payment for already paid invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-already-paid',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PAID02',
          amount: 150000,
          status: 'PAID',
          paidAt: new Date(),
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(409);

      expect(response.body.error.code).toBe('INVOICE_ALREADY_PAID');
    });

    it('should reject payment for expired invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-expired',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-EXP001',
          amount: 150000,
          status: 'EXPIRED',
          expiredAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(400);

      expect(response.body.error.code).toBe('INVOICE_EXPIRED');
    });
  });

  describe('Get Invoice by Order ID', () => {
    it('should return invoice by order ID for owner', async () => {
      if (!dockerAvailable) return;

      const orderId = 'order-by-order-id-test';
      await prisma.invoice.create({
        data: {
          orderId,
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-ORD001',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/invoices/order/${orderId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.orderId).toBe(orderId);
    });

    it('should return null data for non-existent order', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/invoices/order/non-existent-order')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeNull();
    });
  });
});
