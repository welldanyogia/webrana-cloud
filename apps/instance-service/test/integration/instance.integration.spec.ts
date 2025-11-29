import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { DigitalOceanService } from '../../src/modules/digitalocean/digitalocean.service';
import { OrderClientService } from '../../src/modules/order-client/order-client.service';
import {
  createTestApp,
  generateTestToken,
  TEST_USER_ID,
} from '../helpers/test-app';
import {
  createMockDigitalOceanService,
  createMockOrderClientService,
  createMockOrder,
  createMockDroplet,
} from '../helpers/mock-services';

// Skip integration tests unless RUN_INTEGRATION_TESTS=true
const runIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';

(runIntegrationTests ? describe : describe.skip)('Instance Integration Tests', () => {
  let app: INestApplication;
  let token: string;
  let mockDoService: ReturnType<typeof createMockDigitalOceanService>;
  let mockOrderClientService: ReturnType<typeof createMockOrderClientService>;

  const OTHER_USER_ID = 'other-user-456';
  const TEST_ORDER_ID = 'order-test-123';
  const TEST_DROPLET_ID = '12345678';

  beforeAll(async () => {
    // Create mock services
    mockDoService = createMockDigitalOceanService();
    mockOrderClientService = createMockOrderClientService();

    // Create test app with mocked services
    const setup = await createTestApp({
      overrideProviders: [
        { provide: DigitalOceanService, useValue: mockDoService },
        { provide: OrderClientService, useValue: mockOrderClientService },
      ],
    });

    app = setup.app;
    token = generateTestToken(TEST_USER_ID);
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    mockOrderClientService._clearOrders();
    jest.clearAllMocks();
  });

  describe('Instance Listing', () => {
    it('should list user instances with real-time status', async () => {
      // Setup: Add active orders with completed provisioning
      const order1 = createMockOrder({
        orderId: 'order-1',
        userId: TEST_USER_ID,
        dropletId: '11111111',
        ipAddress: '103.1.1.1',
      });
      const order2 = createMockOrder({
        orderId: 'order-2',
        userId: TEST_USER_ID,
        dropletId: '22222222',
        ipAddress: '103.2.2.2',
      });

      mockOrderClientService._addOrder(order1);
      mockOrderClientService._addOrder(order2);

      const response = await request(app.getHttpServer())
        .get('/api/v1/instances')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.data.length).toBe(2);

      // Verify DO API was called for each droplet
      expect(mockDoService.getDroplet).toHaveBeenCalledTimes(2);

      // Verify instance structure
      const instance = response.body.data[0];
      expect(instance.id).toBeDefined();
      expect(instance.hostname).toBeDefined();
      expect(instance.ipAddress).toBeDefined();
      expect(instance.status).toBeDefined();
      expect(instance.plan).toBeDefined();
      expect(instance.image).toBeDefined();
      expect(instance.region).toBeDefined();
    });

    it('should return empty list for user with no instances', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/instances')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should only return instances belonging to the user', async () => {
      // Setup: Add orders for different users
      const myOrder = createMockOrder({
        orderId: 'my-order',
        userId: TEST_USER_ID,
        dropletId: '11111111',
      });
      const otherOrder = createMockOrder({
        orderId: 'other-order',
        userId: OTHER_USER_ID,
        dropletId: '22222222',
      });

      mockOrderClientService._addOrder(myOrder);
      mockOrderClientService._addOrder(otherOrder);

      const response = await request(app.getHttpServer())
        .get('/api/v1/instances')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].id).toBe('my-order');
    });

    it('should paginate instances correctly', async () => {
      // Setup: Add multiple orders
      for (let i = 0; i < 5; i++) {
        const order = createMockOrder({
          orderId: `order-${i}`,
          userId: TEST_USER_ID,
          dropletId: `1111111${i}`,
        });
        mockOrderClientService._addOrder(order);
      }

      const response = await request(app.getHttpServer())
        .get('/api/v1/instances?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });
  });

  describe('Get Instance Detail', () => {
    it('should return instance detail with real-time status', async () => {
      const order = createMockOrder({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        dropletId: TEST_DROPLET_ID,
        ipAddress: '103.123.45.67',
      });
      mockOrderClientService._addOrder(order);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/instances/${TEST_ORDER_ID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(TEST_ORDER_ID);
      expect(response.body.data.doDropletId).toBe(TEST_DROPLET_ID);
      expect(response.body.data.ipAddress).toBeDefined();
      expect(response.body.data.ipAddressPrivate).toBeDefined();
      expect(response.body.data.vcpus).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.disk).toBeDefined();
    });

    it('should return 404 for non-existent instance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/instances/12345678-1234-4234-8234-123456789abc')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INSTANCE_NOT_FOUND');
    });

    it('should return 403 for non-owner', async () => {
      const order = createMockOrder({
        orderId: 'other-user-order',
        userId: OTHER_USER_ID,
        dropletId: TEST_DROPLET_ID,
      });
      mockOrderClientService._addOrder(order);

      const response = await request(app.getHttpServer())
        .get('/api/v1/instances/other-user-order')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('INSTANCE_ACCESS_DENIED');
    });
  });

  describe('Action Execution', () => {
    it('should execute reboot action', async () => {
      const order = createMockOrder({
        orderId: TEST_ORDER_ID,
        userId: TEST_USER_ID,
        dropletId: TEST_DROPLET_ID,
      });
      mockOrderClientService._addOrder(order);

      // Setup mock droplet as active (reboot only works on active droplets)
      (mockDoService as any)._setDroplet(TEST_DROPLET_ID, createMockDroplet({
        dropletId: TEST_DROPLET_ID,
        status: 'active',
      }));

      const response = await request(app.getHttpServer())
        .post(`/api/v1/instances/${TEST_ORDER_ID}/actions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'reboot' })
        .expect(202);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('reboot');
      expect(response.body.data.status).toBe('in-progress');
      expect(response.body.data.id).toBeDefined();

      // Verify DO API was called
      expect(mockDoService.triggerAction).toHaveBeenCalledWith(TEST_DROPLET_ID, 'reboot');
    });

    it('should execute power_off action', async () => {
      const order = createMockOrder({
        orderId: 'power-off-order',
        userId: TEST_USER_ID,
        dropletId: '33333333',
      });
      mockOrderClientService._addOrder(order);

      (mockDoService as any)._setDroplet('33333333', createMockDroplet({
        dropletId: '33333333',
        status: 'active',
      }));

      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/power-off-order/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'power_off' })
        .expect(202);

      expect(response.body.data.type).toBe('power_off');
      expect(mockDoService.triggerAction).toHaveBeenCalledWith('33333333', 'power_off');
    });

    it('should execute power_on action on off instance', async () => {
      const order = createMockOrder({
        orderId: 'power-on-order',
        userId: TEST_USER_ID,
        dropletId: '44444444',
      });
      mockOrderClientService._addOrder(order);

      (mockDoService as any)._setDroplet('44444444', createMockDroplet({
        dropletId: '44444444',
        status: 'off',
      }));

      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/power-on-order/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'power_on' })
        .expect(202);

      expect(response.body.data.type).toBe('power_on');
      expect(mockDoService.triggerAction).toHaveBeenCalledWith('44444444', 'power_on');
    });

    it('should reject power_on on active instance', async () => {
      const order = createMockOrder({
        orderId: 'active-instance',
        userId: TEST_USER_ID,
        dropletId: '55555555',
      });
      mockOrderClientService._addOrder(order);

      (mockDoService as any)._setDroplet('55555555', createMockDroplet({
        dropletId: '55555555',
        status: 'active',
      }));

      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/active-instance/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'power_on' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ACTION_NOT_ALLOWED');
    });

    it('should reject reboot on off instance', async () => {
      const order = createMockOrder({
        orderId: 'off-instance',
        userId: TEST_USER_ID,
        dropletId: '66666666',
      });
      mockOrderClientService._addOrder(order);

      (mockDoService as any)._setDroplet('66666666', createMockDroplet({
        dropletId: '66666666',
        status: 'off',
      }));

      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/off-instance/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'reboot' })
        .expect(400);

      expect(response.body.error.code).toBe('ACTION_NOT_ALLOWED');
    });
  });

  describe('Get Action Status', () => {
    it('should poll action status until complete', async () => {
      const order = createMockOrder({
        orderId: 'action-status-order',
        userId: TEST_USER_ID,
        dropletId: '77777777',
      });
      mockOrderClientService._addOrder(order);

      const actionId = 12345;

      const response = await request(app.getHttpServer())
        .get(`/api/v1/instances/action-status-order/actions/${actionId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(actionId);
      expect(response.body.data.status).toBeDefined();
      expect(['in-progress', 'completed', 'errored']).toContain(response.body.data.status);

      // Verify DO API was called
      expect(mockDoService.getActionStatus).toHaveBeenCalledWith('77777777', actionId);
    });

    it('should return 403 for non-owner checking action status', async () => {
      const order = createMockOrder({
        orderId: 'other-user-action',
        userId: OTHER_USER_ID,
        dropletId: '88888888',
      });
      mockOrderClientService._addOrder(order);

      const response = await request(app.getHttpServer())
        .get('/api/v1/instances/other-user-action/actions/12345')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSTANCE_ACCESS_DENIED');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on actions', async () => {
      const order = createMockOrder({
        orderId: 'rate-limit-order',
        userId: TEST_USER_ID,
        dropletId: '99999999',
      });
      mockOrderClientService._addOrder(order);

      (mockDoService as any)._setDroplet('99999999', createMockDroplet({
        dropletId: '99999999',
        status: 'active',
      }));

      // First action should succeed
      await request(app.getHttpServer())
        .post('/api/v1/instances/rate-limit-order/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'reboot' })
        .expect(202);

      // Second action immediately after should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/rate-limit-order/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'reboot' })
        .expect(429);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/instances')
        .expect(401);
    });

    it('should reject requests with invalid JWT', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/instances')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Invalid Action Type', () => {
    it('should reject invalid action type', async () => {
      const order = createMockOrder({
        orderId: 'invalid-action-order',
        userId: TEST_USER_ID,
        dropletId: '10101010',
      });
      mockOrderClientService._addOrder(order);

      const response = await request(app.getHttpServer())
        .post('/api/v1/instances/invalid-action-order/actions')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid_action' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
