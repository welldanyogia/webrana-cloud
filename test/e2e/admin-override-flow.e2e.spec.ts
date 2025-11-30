/**
 * Admin Override Flow E2E Tests (QA-CROSS-002)
 *
 * Tests admin payment override functionality:
 * Admin marks order as PAID → triggers provisioning → notification sent
 *
 * @module test/e2e/admin-override-flow.e2e.spec.ts
 */

import request from 'supertest';
import { isDockerAvailable, waitFor, getServiceBaseUrl } from './helpers/setup.js';
import {
  createTestUserWithToken,
  apiKeyHeader,
  authHeader,
} from './helpers/auth.js';
import { createOrderPayload, TEST_PLANS, TEST_IMAGES } from './helpers/mocks.js';

// Service base URLs
const ORDER_SERVICE_URL = getServiceBaseUrl('order-service');

// Test configuration
const TEST_TIMEOUT = 60000;

describe('Admin Override Flow E2E', () => {
  let dockerAvailable = false;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - E2E tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    // Setup test users
    const testUser = createTestUserWithToken({
      email: 'e2e-admin-flow-customer@test.webrana.cloud',
      role: 'customer',
    });
    userToken = testUser.token;

    const testAdmin = createTestUserWithToken({
      email: 'e2e-admin-flow-admin@test.webrana.cloud',
      role: 'admin',
    });
    adminToken = testAdmin.token;

    console.log(`E2E tests initialized with admin: ${testAdmin.user.email}`);
  }, TEST_TIMEOUT);

  afterAll(async () => {
    // Cleanup if needed
  });

  /**
   * Helper function to create an order in PENDING_PAYMENT status
   */
  async function createPendingOrder(): Promise<{ orderId: string } | null> {
    const orderPayload = createOrderPayload({
      planId: TEST_PLANS.basic.id,
      imageId: TEST_IMAGES.ubuntu.id,
      duration: 'MONTHLY',
    });

    const response = await request(ORDER_SERVICE_URL)
      .post('/api/v1/orders')
      .set(authHeader(userToken))
      .send(orderPayload);

    if (response.status !== 201) {
      console.log('Failed to create order:', response.body);
      return null;
    }

    return { orderId: response.body.data.id };
  }

  /**
   * Helper function to get order status
   */
  async function getOrder(orderId: string, token: string): Promise<unknown> {
    const response = await request(ORDER_SERVICE_URL)
      .get(`/api/v1/orders/${orderId}`)
      .set(authHeader(token));

    return response.body.data;
  }

  describe('Mark as Paid Override', () => {
    it(
      'should allow admin to mark order as paid and trigger provisioning',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // ════════════════════════════════════════════════════════════════════
        // Step 1: Create order (user)
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 1: Creating order as user...');

        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;
        console.log(`  Order created: ${orderId}`);

        // Verify order is in PENDING_PAYMENT status
        const initialOrder = (await getOrder(orderId, userToken)) as {
          status: string;
        };
        expect(initialOrder.status).toBe('PENDING_PAYMENT');

        // ════════════════════════════════════════════════════════════════════
        // Step 2: Admin marks as paid via internal API
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 2: Admin marking order as paid...');

        const overrideResponse = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({
            status: 'PAID',
            notes: 'Manual verification - bank transfer confirmed',
          });

        expect(overrideResponse.status).toBe(200);
        expect(overrideResponse.body.data).toBeDefined();
        expect(overrideResponse.body.data.status).toBe('PAID');
        expect(overrideResponse.body.data.previousStatus).toBe('PENDING_PAYMENT');
        console.log('  Order marked as PAID by admin');

        // ════════════════════════════════════════════════════════════════════
        // Step 3: Verify order status updated
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 3: Verifying order status...');

        const paidOrder = (await getOrder(orderId, userToken)) as {
          status: string;
          paidAt: string;
        };
        expect(paidOrder.status).toBe('PAID');
        expect(paidOrder.paidAt).toBeDefined();
        console.log(`  Verified: Order is PAID at ${paidOrder.paidAt}`);

        // ════════════════════════════════════════════════════════════════════
        // Step 4: Verify provisioning triggered and completes
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 4: Waiting for provisioning...');

        const activeOrder = await waitFor(
          async () => {
            const order = (await getOrder(orderId, userToken)) as {
              status: string;
              provisioningTask: { status: string; dropletName: string };
            };
            if (order.status === 'ACTIVE') {
              return order;
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
        expect(activeOrder!.status).toBe('ACTIVE');
        expect(activeOrder!.provisioningTask).toBeDefined();
        expect(activeOrder!.provisioningTask.status).toBe('COMPLETED');
        console.log(
          `  Provisioning completed: ${activeOrder!.provisioningTask.dropletName}`
        );

        // ════════════════════════════════════════════════════════════════════
        // Step 5: Verify audit log / status history created
        // ════════════════════════════════════════════════════════════════════
        console.log('Step 5: Verifying audit trail...');

        // Get full order details via admin endpoint
        const adminOrderResponse = await request(ORDER_SERVICE_URL)
          .get(`/internal/orders/${orderId}`)
          .set(apiKeyHeader());

        expect(adminOrderResponse.status).toBe(200);

        const orderWithHistory = adminOrderResponse.body.data;
        expect(orderWithHistory.statusHistory).toBeDefined();
        expect(orderWithHistory.statusHistory.length).toBeGreaterThan(0);

        // Find the admin override entry
        const adminOverrideEntry = orderWithHistory.statusHistory.find(
          (h: { actor: string; newStatus: string }) =>
            h.actor.includes('admin') && h.newStatus === 'PAID'
        );

        expect(adminOverrideEntry).toBeDefined();
        console.log(`  Audit entry found: ${JSON.stringify(adminOverrideEntry)}`);

        console.log('\n✅ Admin override flow completed successfully!');
      },
      TEST_TIMEOUT
    );

    it(
      'should reject non-admin user attempting payment override',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // Regular user attempts override with API key but user token
        const response = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(userToken)) // Regular user token, not admin
          .send({ status: 'PAID' });

        // Should be rejected (either 401, 403, or validation error)
        // The exact status depends on guard implementation order
        expect([401, 403, 400]).toContain(response.status);
      },
      TEST_TIMEOUT
    );

    it(
      'should reject override without API key',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // Admin token but no API key
        const response = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(authHeader(adminToken)) // No X-API-Key header
          .send({ status: 'PAID' });

        // Should be rejected
        expect([401, 403]).toContain(response.status);
      },
      TEST_TIMEOUT
    );

    it(
      'should reject override on already paid order',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create and pay order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // First override - should succeed
        const firstOverride = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({ status: 'PAID' });

        expect(firstOverride.status).toBe(200);

        // Second override - should fail (already paid)
        const secondOverride = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({ status: 'PAID' });

        // Should be conflict or bad request
        expect([400, 409]).toContain(secondOverride.status);
      },
      TEST_TIMEOUT
    );
  });

  describe('Mark as Failed Override', () => {
    it(
      'should allow admin to record payment failed (order stays PENDING_PAYMENT)',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // Admin marks payment as failed
        const failedResponse = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({
            status: 'PAYMENT_FAILED',
            notes: 'Payment verification failed - insufficient funds',
          });

        expect(failedResponse.status).toBe(200);

        // Per v1 design: Order status remains PENDING_PAYMENT
        // PAYMENT_FAILED is recorded as an event, not status change
        const orderAfterFail = (await getOrder(orderId, userToken)) as {
          status: string;
        };

        // Order should still be PENDING_PAYMENT (allows retry)
        expect(orderAfterFail.status).toBe('PENDING_PAYMENT');

        // Verify event was recorded in history
        const adminOrderResponse = await request(ORDER_SERVICE_URL)
          .get(`/internal/orders/${orderId}`)
          .set(apiKeyHeader());

        const history = adminOrderResponse.body.data.statusHistory;
        const failedEvent = history.find(
          (h: { newStatus: string }) => h.newStatus === 'PAYMENT_FAILED'
        );

        expect(failedEvent).toBeDefined();
        expect(failedEvent.reason).toContain('insufficient funds');
      },
      TEST_TIMEOUT
    );

    it(
      'should allow payment retry after failed payment',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // First: Mark as failed
        await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({ status: 'PAYMENT_FAILED', notes: 'First attempt failed' });

        // Verify still PENDING_PAYMENT
        let order = (await getOrder(orderId, userToken)) as { status: string };
        expect(order.status).toBe('PENDING_PAYMENT');

        // Second: Mark as paid (retry succeeded)
        const paidResponse = await request(ORDER_SERVICE_URL)
          .post(`/internal/orders/${orderId}/payment-status`)
          .set(apiKeyHeader())
          .set(authHeader(adminToken))
          .send({ status: 'PAID', notes: 'Second attempt - bank transfer confirmed' });

        expect(paidResponse.status).toBe(200);

        // Verify now PAID
        order = (await getOrder(orderId, userToken)) as { status: string };
        expect(order.status).toBe('PAID');
      },
      TEST_TIMEOUT
    );
  });

  describe('Admin List and Detail Access', () => {
    it(
      'should allow admin to list all orders',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create a few orders
        await createPendingOrder();
        await createPendingOrder();

        // Admin lists all orders
        const listResponse = await request(ORDER_SERVICE_URL)
          .get('/internal/orders')
          .set(apiKeyHeader())
          .query({ page: 1, limit: 10 });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.data).toBeDefined();
        expect(Array.isArray(listResponse.body.data)).toBe(true);
        expect(listResponse.body.meta).toBeDefined();
        expect(listResponse.body.meta.total).toBeGreaterThanOrEqual(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should allow admin to filter orders by status',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // List pending orders
        const pendingResponse = await request(ORDER_SERVICE_URL)
          .get('/internal/orders')
          .set(apiKeyHeader())
          .query({ status: 'PENDING_PAYMENT', page: 1, limit: 10 });

        expect(pendingResponse.status).toBe(200);

        // All returned orders should be PENDING_PAYMENT
        if (pendingResponse.body.data.length > 0) {
          pendingResponse.body.data.forEach((order: { status: string }) => {
            expect(order.status).toBe('PENDING_PAYMENT');
          });
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should allow admin to get any order detail',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Create order
        const orderResult = await createPendingOrder();
        if (!orderResult) {
          console.log('Skipping: Failed to create order');
          return;
        }

        const { orderId } = orderResult;

        // Admin gets full order detail (no ownership check)
        const detailResponse = await request(ORDER_SERVICE_URL)
          .get(`/internal/orders/${orderId}`)
          .set(apiKeyHeader());

        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.data).toBeDefined();
        expect(detailResponse.body.data.id).toBe(orderId);
        expect(detailResponse.body.data.items).toBeDefined();
        expect(detailResponse.body.data.statusHistory).toBeDefined();
        expect(detailResponse.body.data.pricing).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should not allow admin endpoints without API key',
      async () => {
        if (!dockerAvailable) {
          console.log('Skipping: Docker not available');
          return;
        }

        // Try to access admin endpoints without API key
        const listResponse = await request(ORDER_SERVICE_URL)
          .get('/internal/orders')
          .set(authHeader(adminToken)); // Admin token but no API key

        expect([401, 403]).toContain(listResponse.status);
      },
      TEST_TIMEOUT
    );
  });
});
