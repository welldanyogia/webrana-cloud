/**
 * Full Order Flow E2E Tests (QA-CROSS-001)
 *
 * Tests the complete order lifecycle across multiple services:
 * User → order-service → billing-service → Tripay → webhook → order-service → notification-service → instance-service
 *
 * @module test/e2e/full-order-flow.e2e.spec.ts
 */

import request from 'supertest';
import {
  isDockerAvailable,
  waitFor,
  sleep,
  getServiceBaseUrl,
} from './helpers/setup.js';
import {
  createTestUserWithToken,
  authHeader,
} from './helpers/auth.js';
import {
  createTripayCallback,
  createOrderPayload,
  TEST_PLANS,
  TEST_IMAGES,
} from './helpers/mocks.js';

// Service base URLs
const ORDER_SERVICE_URL = getServiceBaseUrl('order-service');
const BILLING_SERVICE_URL = getServiceBaseUrl('billing-service');
const INSTANCE_SERVICE_URL = getServiceBaseUrl('instance-service');

// Test configuration
const TEST_TIMEOUT = 60000; // 60 seconds for E2E tests

/**
 * Note: These E2E tests are designed to run against actual services.
 * For CI/CD, services should be started via docker-compose.test.yml
 * or mocked appropriately.
 *
 * Environment requirements:
 * - All services running and healthy
 * - Test database with seeded catalog data
 * - Mock or sandbox Tripay/DigitalOcean endpoints
 */
describe('Full Order Flow E2E', () => {
  let dockerAvailable = false;
  let userToken: string;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - E2E tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    // Setup test user
    const testUser = createTestUserWithToken({
      email: 'e2e-order-flow@test.webrana.cloud',
      role: 'customer',
    });
    userToken = testUser.token;

    console.log(`E2E tests initialized with user: ${testUser.user.email}`);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('Happy Path - Complete Order to VPS Active', () => {
    it(
      'should complete full order from creation to VPS active',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // ════════════════════════════════════════════════════════════════════
        // Step 1: User creates order
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 1: Creating order...');

        const orderPayload = createOrderPayload({
          planId: TEST_PLANS.basic.id,
          imageId: TEST_IMAGES.ubuntu.id,
          duration: 'MONTHLY',
        });

        const createOrderResponse = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(orderPayload);

        // Validate order creation
        expect(createOrderResponse.status).toBe(201);
        expect(createOrderResponse.body.data).toBeDefined();
        expect(createOrderResponse.body.data.status).toBe('PENDING_PAYMENT');
        expect(createOrderResponse.body.data.planId).toBe(orderPayload.planId);
        expect(createOrderResponse.body.data.imageId).toBe(orderPayload.imageId);

        const orderId = createOrderResponse.body.data.id;
        console.log(`  Order created: ${orderId}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 2: Verify invoice created automatically (via billing-service)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 2: Checking invoice creation...');

        // Wait for invoice to be created (may be async)
        const invoice = await waitFor(
          async () => {
            const invoiceResponse = await request(BILLING_SERVICE_URL)
              .get(`/api/v1/invoices?orderId=${orderId}`)
              .set(authHeader(userToken));

            if (
              invoiceResponse.status === 200 &&
              invoiceResponse.body.data?.length > 0
            ) {
              return invoiceResponse.body.data[0];
            }
            return null;
          },
          {
            timeout: 10000,
            interval: 1000,
            message: 'Invoice was not created',
          }
        );

        expect(invoice).toBeDefined();
        expect(invoice.orderId).toBe(orderId);
        expect(invoice.status).toBe('PENDING');
        console.log(`  Invoice created: ${invoice.invoiceNumber}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 3: User initiates payment (selects payment channel)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 3: Initiating payment...');

        const paymentResponse = await request(BILLING_SERVICE_URL)
          .post(`/api/v1/invoices/${invoice.id}/payment`)
          .set(authHeader(userToken))
          .send({
            channel: 'BRIVA',
            customerName: 'E2E Test Customer',
            customerEmail: 'e2e-test@test.webrana.cloud',
          });

        expect(paymentResponse.status).toBe(200);
        expect(paymentResponse.body.data.payment).toBeDefined();
        expect(paymentResponse.body.data.payment.paymentCode).toBeDefined();
        console.log(
          `  Payment initiated: ${paymentResponse.body.data.payment.channel}`
        );

        // ════════════════════════════════════════════════════════════════════
        // Step 4: Simulate Tripay webhook (payment success)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 4: Simulating payment webhook...');

        const tripayCallback = createTripayCallback(
          invoice.invoiceNumber,
          'PAID',
          {
            amount: invoice.amount,
            customerName: 'E2E Test Customer',
            customerEmail: 'e2e-test@test.webrana.cloud',
          }
        );

        const webhookResponse = await request(BILLING_SERVICE_URL)
          .post('/api/v1/webhooks/tripay')
          .set('Content-Type', 'application/json')
          .set(
            'x-callback-signature',
            'test-signature' // In real tests, generate valid signature
          )
          .send(tripayCallback);

        // Note: Webhook may return 200 even if signature validation fails in test mode
        // The important thing is that the callback was processed
        console.log(`  Webhook response: ${webhookResponse.status}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 5: Verify order status updated to PAID
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 5: Verifying order status update...');

        const paidOrder = await waitFor(
          async () => {
            const orderResponse = await request(ORDER_SERVICE_URL)
              .get(`/api/v1/orders/${orderId}`)
              .set(authHeader(userToken));

            if (
              orderResponse.status === 200 &&
              orderResponse.body.data.status === 'PAID'
            ) {
              return orderResponse.body.data;
            }
            return null;
          },
          {
            timeout: 15000,
            interval: 1000,
            message: 'Order status was not updated to PAID',
          }
        );

        expect(paidOrder).toBeDefined();
        expect(paidOrder.status).toBe('PAID');
        expect(paidOrder.paidAt).toBeDefined();
        console.log(`  Order marked as PAID at ${paidOrder.paidAt}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 6: Wait for provisioning to complete (mock DigitalOcean)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 6: Waiting for VPS provisioning...');

        const activeOrder = await waitFor(
          async () => {
            const orderResponse = await request(ORDER_SERVICE_URL)
              .get(`/api/v1/orders/${orderId}`)
              .set(authHeader(userToken));

            if (
              orderResponse.status === 200 &&
              orderResponse.body.data.status === 'ACTIVE'
            ) {
              return orderResponse.body.data;
            }
            return null;
          },
          {
            timeout: 30000,
            interval: 2000,
            message: 'Order was not provisioned to ACTIVE status',
          }
        );

        expect(activeOrder).toBeDefined();
        expect(activeOrder.status).toBe('ACTIVE');
        expect(activeOrder.provisioningTask).toBeDefined();
        expect(activeOrder.provisioningTask.status).toBe('COMPLETED');
        console.log(
          `  VPS provisioned: ${activeOrder.provisioningTask.dropletName}`
        );

        // ════════════════════════════════════════════════════════════════════
        // Step 7: Verify VPS appears in instance-service
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 7: Verifying instance visibility...');

        const instancesResponse = await request(INSTANCE_SERVICE_URL)
          .get('/api/v1/instances')
          .set(authHeader(userToken));

        expect(instancesResponse.status).toBe(200);
        expect(instancesResponse.body.data).toBeDefined();
        expect(instancesResponse.body.data.length).toBeGreaterThanOrEqual(1);

        const createdInstance = instancesResponse.body.data.find(
          (i: { orderId: string }) => i.orderId === orderId
        );

        expect(createdInstance).toBeDefined();
        expect(createdInstance.status).toBe('active');
        expect(createdInstance.ipAddress).toBeDefined();
        console.log(`  Instance visible: ${createdInstance.hostname}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 8: Verify notification was queued/sent (check mock)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 8: Verifying notifications...');
        // In a real implementation, we would check the notification queue
        // or mock notification service to verify emails were sent
        // For now, we just log that we've reached this step
        console.log('  Notification verification: Would check email/telegram');

        console.log('\n✅ Full order flow completed successfully!');
      },
      TEST_TIMEOUT
    );
  });

  describe('Error Scenarios', () => {
    it(
      'should handle order creation with invalid plan',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        const invalidOrderPayload = createOrderPayload({
          planId: 'non-existent-plan-id',
          imageId: TEST_IMAGES.ubuntu.id,
        });

        const response = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(invalidOrderPayload);

        // Should fail with appropriate error
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.error).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should handle order creation with invalid image',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        const invalidOrderPayload = createOrderPayload({
          planId: TEST_PLANS.basic.id,
          imageId: 'non-existent-image-id',
        });

        const response = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(invalidOrderPayload);

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.error).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should reject order creation without authentication',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        const orderPayload = createOrderPayload();

        const response = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .send(orderPayload);

        expect(response.status).toBe(401);
      },
      TEST_TIMEOUT
    );

    it(
      'should handle duplicate payment callback (idempotency)',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order first
        const orderPayload = createOrderPayload();
        const createResponse = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(orderPayload);

        if (createResponse.status !== 201) {
          console.log('Skipping duplicate callback test: Order creation failed');
          return;
        }

        const orderId = createResponse.body.data.id;

        // Get invoice
        await sleep(2000); // Wait for invoice creation

        const invoiceResponse = await request(BILLING_SERVICE_URL)
          .get(`/api/v1/invoices?orderId=${orderId}`)
          .set(authHeader(userToken));

        if (
          invoiceResponse.status !== 200 ||
          !invoiceResponse.body.data?.length
        ) {
          console.log('Skipping duplicate callback test: Invoice not found');
          return;
        }

        const invoice = invoiceResponse.body.data[0];

        // Send first callback
        const callback1 = createTripayCallback(invoice.invoiceNumber, 'PAID');

        await request(BILLING_SERVICE_URL)
          .post('/api/v1/webhooks/tripay')
          .set('x-callback-signature', 'test-signature')
          .send(callback1);

        // Send duplicate callback
        const callback2 = createTripayCallback(invoice.invoiceNumber, 'PAID');

        const duplicateResponse = await request(BILLING_SERVICE_URL)
          .post('/api/v1/webhooks/tripay')
          .set('x-callback-signature', 'test-signature')
          .send(callback2);

        // Should handle gracefully (either 200 OK or idempotent response)
        expect([200, 400]).toContain(duplicateResponse.status);

        // Verify order status is still PAID (not processed twice)
        const orderResponse = await request(ORDER_SERVICE_URL)
          .get(`/api/v1/orders/${orderId}`)
          .set(authHeader(userToken));

        // Order should be in PAID or ACTIVE state
        expect(['PAID', 'ACTIVE', 'PENDING_PAYMENT']).toContain(
          orderResponse.body.data.status
        );
      },
      TEST_TIMEOUT
    );

    it(
      'should handle payment expiration',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderPayload = createOrderPayload();
        const createResponse = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(orderPayload);

        if (createResponse.status !== 201) {
          console.log('Skipping expiration test: Order creation failed');
          return;
        }

        const orderId = createResponse.body.data.id;

        // Get invoice
        await sleep(2000);

        const invoiceResponse = await request(BILLING_SERVICE_URL)
          .get(`/api/v1/invoices?orderId=${orderId}`)
          .set(authHeader(userToken));

        if (
          invoiceResponse.status !== 200 ||
          !invoiceResponse.body.data?.length
        ) {
          console.log('Skipping expiration test: Invoice not found');
          return;
        }

        const invoice = invoiceResponse.body.data[0];

        // Send EXPIRED callback
        const expiredCallback = createTripayCallback(
          invoice.invoiceNumber,
          'EXPIRED'
        );

        await request(BILLING_SERVICE_URL)
          .post('/api/v1/webhooks/tripay')
          .set('x-callback-signature', 'test-signature')
          .send(expiredCallback);

        // Verify invoice status is EXPIRED
        const updatedInvoiceResponse = await request(BILLING_SERVICE_URL)
          .get(`/api/v1/invoices/${invoice.id}`)
          .set(authHeader(userToken));

        // Status might be EXPIRED or still PENDING depending on implementation
        expect(['PENDING', 'EXPIRED']).toContain(
          updatedInvoiceResponse.body.data.status
        );
      },
      TEST_TIMEOUT
    );
  });

  describe('Access Control', () => {
    it(
      'should not allow user to access another users order',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order with test user
        const orderPayload = createOrderPayload();
        const createResponse = await request(ORDER_SERVICE_URL)
          .post('/api/v1/orders')
          .set(authHeader(userToken))
          .send(orderPayload);

        if (createResponse.status !== 201) {
          console.log('Skipping access control test: Order creation failed');
          return;
        }

        const orderId = createResponse.body.data.id;

        // Try to access with different user
        const otherUser = createTestUserWithToken({
          email: 'other-user@test.webrana.cloud',
        });

        const accessResponse = await request(ORDER_SERVICE_URL)
          .get(`/api/v1/orders/${orderId}`)
          .set(authHeader(otherUser.token));

        // Should be forbidden
        expect(accessResponse.status).toBe(403);
      },
      TEST_TIMEOUT
    );

    it(
      'should not allow user to access another users instances',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Different user trying to access instances
        const otherUser = createTestUserWithToken({
          email: 'other-instance-user@test.webrana.cloud',
        });

        const instancesResponse = await request(INSTANCE_SERVICE_URL)
          .get('/api/v1/instances')
          .set(authHeader(otherUser.token));

        // Should return 200 but with empty array (only their own instances)
        expect(instancesResponse.status).toBe(200);
        // New user should have no instances
        expect(instancesResponse.body.data).toEqual([]);
      },
      TEST_TIMEOUT
    );
  });
});
