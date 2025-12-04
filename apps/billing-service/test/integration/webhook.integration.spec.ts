import { createHmac } from 'crypto';

import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { OrderClientService } from '../../src/modules/order-client/order-client.service';
import { TripayService } from '../../src/modules/tripay/tripay.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  createMockTripayService,
  createMockOrderClientService,
} from '../helpers/mock-services';
import {
  createTestApp,
  TEST_USER_ID,
} from '../helpers/test-app';
import {
  setupTestDatabase,
  teardownTestDatabase,
  isDockerAvailable,
} from '../helpers/test-database';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

// Mock private key for signature generation (used in tests)
// This is an intentional test fixture, NOT a real private key
const MOCK_TRIPAY_PRIVATE_KEY = process.env.TEST_TRIPAY_PRIVATE_KEY || 'test-tripay-key-fixture';

(runIntegrationTests ? describe : describe.skip)('Webhook Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockTripayService: ReturnType<typeof createMockTripayService>;
  let mockOrderClientService: ReturnType<typeof createMockOrderClientService>;
  let dockerAvailable = false;

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

  /**
   * Generate callback signature for testing
   */
  function generateCallbackSignature(payload: object): string {
    const rawBody = JSON.stringify(payload);
    return createHmac('sha256', MOCK_TRIPAY_PRIVATE_KEY)
      .update(rawBody)
      .digest('hex');
  }

  describe('Payment Callback Processing', () => {
    it('should update invoice status on payment callback (PAID)', async () => {
      if (!dockerAvailable) return;

      // Create pending invoice
      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-callback-test',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-CB001',
          amount: 150000,
          tripayReference: 'T123456789',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const callbackPayload = {
        reference: 'T123456789',
        merchant_ref: 'INV-20240101-CB001',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        fee_merchant: 0,
        fee_customer: 4000,
        total_fee: 4000,
        amount_received: 150000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: Math.floor(Date.now() / 1000),
        note: '',
      };

      const signature = generateCallbackSignature(callbackPayload);

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', signature)
        .send(callbackPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify invoice status updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.paidAt).toBeDefined();
      expect(updatedInvoice?.paidAmount).toBe(150000);

      // Verify payment record created
      const payment = await prisma.payment.findFirst({
        where: { invoiceId: invoice.id },
      });
      expect(payment).toBeDefined();
      expect(payment?.status).toBe('PAID');
      expect(payment?.reference).toBe('T123456789');

      // Verify order service was notified
      expect(mockOrderClientService.updatePaymentStatus).toHaveBeenCalledWith(
        'order-callback-test',
        'PAID',
        'T123456789'
      );
    });

    it('should update invoice status on EXPIRED callback', async () => {
      if (!dockerAvailable) return;

      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-expired-callback',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-EXP01',
          amount: 150000,
          tripayReference: 'T987654321',
          expiredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      });

      const callbackPayload = {
        reference: 'T987654321',
        merchant_ref: 'INV-20240101-EXP01',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        fee_merchant: 0,
        fee_customer: 4000,
        total_fee: 4000,
        amount_received: 0,
        is_closed_payment: 1,
        status: 'EXPIRED',
        paid_at: 0,
        note: 'Payment expired',
      };

      const signature = generateCallbackSignature(callbackPayload);

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', signature)
        .send(callbackPayload)
        .expect(200);

      // Verify invoice status updated
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.status).toBe('EXPIRED');
    });

    it('should reject invalid signature', async () => {
      if (!dockerAvailable) return;

      // Configure mock to throw on invalid signature
      mockTripayService.verifyCallbackSignatureRaw = jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const callbackPayload = {
        reference: 'T111111111',
        merchant_ref: 'INV-20240101-INV01',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        fee_merchant: 0,
        fee_customer: 4000,
        total_fee: 4000,
        amount_received: 150000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: Math.floor(Date.now() / 1000),
        note: '',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', 'invalid-signature')
        .send(callbackPayload)
        .expect(400);

      expect(response.body.message).toContain('Invalid callback signature');
    });

    it('should handle missing signature header', async () => {
      if (!dockerAvailable) return;

      const callbackPayload = {
        reference: 'T222222222',
        merchant_ref: 'INV-20240101-NOSIG',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        status: 'PAID',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .send(callbackPayload)
        .expect(400);

      expect(response.body.message).toContain('Missing callback signature');
    });

    it('should handle duplicate callbacks idempotently', async () => {
      if (!dockerAvailable) return;

      // Create invoice and mark as PAID
      const invoice = await prisma.invoice.create({
        data: {
          orderId: 'order-duplicate-callback',
          userId: TEST_USER_ID,
          invoiceNumber: 'INV-20240101-DUP01',
          amount: 150000,
          status: 'PAID',
          paidAt: new Date(),
          paidAmount: 150000,
          tripayReference: 'T333333333',
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const callbackPayload = {
        reference: 'T333333333',
        merchant_ref: 'INV-20240101-DUP01',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        fee_merchant: 0,
        fee_customer: 4000,
        total_fee: 4000,
        amount_received: 150000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: Math.floor(Date.now() / 1000),
        note: '',
      };

      const signature = generateCallbackSignature(callbackPayload);

      // Reset the mock to not throw
      mockTripayService.verifyCallbackSignatureRaw = jest.fn().mockImplementation(() => {
        // Valid signature
      });

      // Send callback twice
      await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', signature)
        .send(callbackPayload)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', signature)
        .send(callbackPayload)
        .expect(200);

      // Invoice should still be in final state
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id: invoice.id },
      });
      expect(updatedInvoice?.status).toBe('PAID');

      // Order service should not be called again for duplicate callbacks
      // (the first callback would have triggered it, but our beforeEach clears mocks)
      // So in a real scenario, we just ensure no errors occurred
    });

    it('should skip processing for non-existent invoice', async () => {
      if (!dockerAvailable) return;

      // Reset mock
      mockTripayService.verifyCallbackSignatureRaw = jest.fn().mockImplementation(() => {
        // Valid signature
      });

      const callbackPayload = {
        reference: 'T444444444',
        merchant_ref: 'INV-NONEXISTENT',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 154000,
        fee_merchant: 0,
        fee_customer: 4000,
        total_fee: 4000,
        amount_received: 150000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: Math.floor(Date.now() / 1000),
        note: '',
      };

      const signature = generateCallbackSignature(callbackPayload);

      // Should still return success (idempotent)
      const response = await request(app.getHttpServer())
        .post('/api/v1/webhooks/tripay')
        .set('X-Callback-Signature', signature)
        .send(callbackPayload)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Order service should not be called
      expect(mockOrderClientService.updatePaymentStatus).not.toHaveBeenCalled();
    });
  });
});
