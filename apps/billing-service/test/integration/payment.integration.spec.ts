import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { OrderClientService } from '../../src/modules/order-client/order-client.service';
import { TripayService } from '../../src/modules/tripay/tripay.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  createMockTripayService,
  createMockOrderClientService,
  MOCK_PAYMENT_CHANNELS,
} from '../helpers/mock-services';
import {
  createTestApp,
  generateTestToken,
  TEST_USER_ID,
} from '../helpers/test-app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  isDockerAvailable,
} from '../helpers/test-database';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(runIntegrationTests ? describe : describe.skip)('Payment Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let mockTripayService: ReturnType<typeof createMockTripayService>;
  let mockOrderClientService: ReturnType<typeof createMockOrderClientService>;
  let dockerAvailable = false;

  const OTHER_USER_ID = 'other-user-456';

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      console.warn('\n⚠️  Docker not available - integration tests will be skipped');
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

  describe('Payment Channel Listing', () => {
    it('should return all available payment channels', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(MOCK_PAYMENT_CHANNELS.length);

      // Verify channel structure
      const channel = response.body.data[0];
      expect(channel).toHaveProperty('code');
      expect(channel).toHaveProperty('name');
      expect(channel).toHaveProperty('group');
      expect(channel).toHaveProperty('type');
      expect(channel).toHaveProperty('fee');
      expect(channel.fee).toHaveProperty('flat');
      expect(channel.fee).toHaveProperty('percent');
    });

    it('should include Virtual Account channels', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      const vaChannels = response.body.data.filter(
        (ch: { type: string }) => ch.type === 'virtual_account'
      );
      expect(vaChannels.length).toBeGreaterThan(0);
      expect(vaChannels[0].group).toBe('Virtual Account');
    });

    it('should include E-Wallet channels', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      const ewalletChannels = response.body.data.filter(
        (ch: { type: string }) => ch.type === 'ewallet'
      );
      expect(ewalletChannels.length).toBeGreaterThan(0);
      expect(ewalletChannels[0].group).toBe('E-Wallet');
    });

    it('should include QRIS channels', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      const qrisChannels = response.body.data.filter(
        (ch: { type: string }) => ch.type === 'qris'
      );
      expect(qrisChannels.length).toBeGreaterThan(0);
      expect(qrisChannels[0].group).toBe('QRIS');
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      if (!dockerAvailable) return;

      // No Authorization header
      const response = await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Payment Channel Selection', () => {
    it('should initiate payment with Virtual Account channel', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-va-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-VA001',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data.payment.channel).toBe('BRIVA');
      expect(response.body.data.payment.paymentCode).toBeDefined();
      expect(response.body.data.invoice.paymentMethod).toBe('VIRTUAL_ACCOUNT');

      // Verify database updated with payment channel
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentChannel).toBe('BRI_VA');
    });

    it('should initiate payment with E-Wallet channel (OVO)', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-ovo-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-OVO01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'OVO' })
        .expect(200);

      expect(response.body.data.payment.channel).toBe('OVO');
      expect(response.body.data.invoice.paymentMethod).toBe('EWALLET');

      // Verify database updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentChannel).toBe('OVO');
    });

    it('should initiate payment with QRIS channel', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-qris-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-QR001',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'QRIS' })
        .expect(200);

      expect(response.body.data.payment.channel).toBe('QRIS');
      expect(response.body.data.invoice.paymentMethod).toBe('QRIS');

      // Verify database updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentChannel).toBe('QRIS');
    });

    it('should reject invalid payment channel', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-invalid-channel',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-INV01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'INVALID_CHANNEL' })
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('TRIPAY_CHANNEL_NOT_FOUND');
    });
  });

  describe('Payment Fee Calculation', () => {
    it('should calculate flat fee correctly for Virtual Account', async () => {
      if (!dockerAvailable) return;

      const amount = 100000;
      const expectedFlatFee = 4000; // BRIVA has flat fee of 4000

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-fee-va',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-FVA01',
          amount,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data.payment.fee).toBe(expectedFlatFee);
      expect(response.body.data.payment.totalAmount).toBe(amount + expectedFlatFee);
    });

    it('should calculate percentage fee correctly for E-Wallet', async () => {
      if (!dockerAvailable) return;

      const amount = 100000;
      // OVO has 2.5% fee with min 500
      const expectedPercentFee = Math.round((amount * 2.5) / 100);

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-fee-ewallet',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-FEW01',
          amount,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'OVO' })
        .expect(200);

      expect(response.body.data.payment.fee).toBe(expectedPercentFee);
      expect(response.body.data.payment.totalAmount).toBe(amount + expectedPercentFee);
    });

    it('should calculate percentage fee correctly for QRIS', async () => {
      if (!dockerAvailable) return;

      const amount = 100000;
      // QRIS has 0.7% fee with min 100
      const expectedPercentFee = Math.round((amount * 0.7) / 100);

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-fee-qris',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-FQR01',
          amount,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'QRIS' })
        .expect(200);

      expect(response.body.data.payment.fee).toBe(expectedPercentFee);
      expect(response.body.data.payment.totalAmount).toBe(amount + expectedPercentFee);
    });

    it('should store payment fee in invoice record', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-fee-store',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-FST01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(updatedInvoice?.paymentFee).toBe(4000);
    });
  });

  describe('Payment Code/VA Generation', () => {
    it('should generate unique payment code for Virtual Account', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-paycode-va',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PVA01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data.payment.paymentCode).toBeDefined();
      expect(response.body.data.payment.paymentCode.length).toBeGreaterThan(0);

      // Verify stored in database
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentCode).toBe(response.body.data.payment.paymentCode);
    });

    it('should generate checkout URL for payment', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-checkout-url',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-URL01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data.payment.paymentUrl).toBeDefined();
      expect(response.body.data.payment.paymentUrl).toContain('tripay.co.id');

      // Verify stored in database
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.paymentUrl).toBe(response.body.data.payment.paymentUrl);
    });

    it('should store Tripay reference in invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-tripay-ref',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-REF01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(updatedInvoice?.tripayReference).toBeDefined();
      expect(updatedInvoice?.tripayReference?.length).toBeGreaterThan(0);
    });

    it('should return payment instructions', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-instructions',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-INS01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      expect(response.body.data.payment.instructions).toBeDefined();
      expect(Array.isArray(response.body.data.payment.instructions)).toBe(true);
    });
  });

  describe('Payment Status Updates', () => {
    it('should update invoice payment details on successful payment initiation', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-status-init',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-STI01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Before payment initiation
      expect(invoice.paymentMethod).toBeNull();
      expect(invoice.paymentChannel).toBeNull();
      expect(invoice.tripayReference).toBeNull();

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      // After payment initiation
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      expect(updatedInvoice?.paymentMethod).toBe('VIRTUAL_ACCOUNT');
      expect(updatedInvoice?.paymentChannel).toBe('BRI_VA');
      expect(updatedInvoice?.tripayReference).toBeDefined();
      expect(updatedInvoice?.paymentCode).toBeDefined();
      expect(updatedInvoice?.paymentUrl).toBeDefined();
      expect(updatedInvoice?.paymentName).toBe('BRI Virtual Account');
    });

    it('should maintain PENDING status after payment initiation (until callback)', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-status-pending',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PND01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(200);

      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });

      // Status should still be PENDING until payment callback confirms payment
      expect(updatedInvoice?.status).toBe('PENDING');
      expect(updatedInvoice?.paidAt).toBeNull();
    });

    it('should prevent re-initiation for already paid invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-already-paid',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-PAID1',
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

    it('should prevent re-initiation for expired invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-expired-init',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-EXP01',
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

  describe('Payment Authorization', () => {
    it('should reject payment initiation without authentication', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-noauth',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-NOA01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .send({ channel: 'BRIVA' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject payment initiation for other user invoice', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-other-user',
          userId: OTHER_USER_ID, // Different user
          invoiceNumber: 'INV-20240101-OTH01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`) // TEST_USER_ID token
        .send({ channel: 'BRIVA' })
        .expect(403);

      expect(response.body.error.code).toBe('INVOICE_ACCESS_DENIED');
    });

    it('should reject payment initiation for non-existent invoice', async () => {
      if (!dockerAvailable) return;

      const fakeInvoiceId = '12345678-1234-4234-8234-123456789abc';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/invoices/${fakeInvoiceId}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({ channel: 'BRIVA' })
        .expect(404);

      expect(response.body.error.code).toBe('INVOICE_NOT_FOUND');
    });
  });

  describe('Tripay Service Integration', () => {
    it('should call Tripay createTransaction with correct parameters', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-tripay-call',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-TRP01',
          amount: 150000,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/invoices/${invoice.id}/pay`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          channel: 'BRIVA',
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerPhone: '081234567890',
        })
        .expect(200);

      expect(mockTripayService.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'BRIVA',
          merchantRef: 'INV-20240101-TRP01',
          amount: 150000,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          customerPhone: '081234567890',
        })
      );
    });

    it('should call Tripay getPaymentChannels for channel listing', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .get('/api/v1/payment-channels')
        .expect(200);

      expect(mockTripayService.getPaymentChannels).toHaveBeenCalled();
    });
  });
});
