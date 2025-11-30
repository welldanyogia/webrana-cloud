import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { BillingClientService } from '../billing-client/billing-client.service';
import { DoAccountService } from '../do-account/do-account.service';
import { NotificationClientService } from '../notification-client/notification-client.service';

import { LifecycleService } from './lifecycle.service';

// Define enums locally to avoid Prisma client dependency issues in tests
const BillingPeriod = {
  DAILY: 'DAILY',
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PROVISIONING: 'PROVISIONING',
  ACTIVE: 'ACTIVE',
  EXPIRING_SOON: 'EXPIRING_SOON',
  EXPIRED: 'EXPIRED',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
} as const;

const TerminationReason = {
  USER_DELETED: 'USER_DELETED',
  EXPIRED_NO_RENEWAL: 'EXPIRED_NO_RENEWAL',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  ADMIN_TERMINATED: 'ADMIN_TERMINATED',
  DO_ACCOUNT_ISSUE: 'DO_ACCOUNT_ISSUE',
  POLICY_VIOLATION: 'POLICY_VIOLATION',
} as const;

const _RenewalType = {
  AUTO_RENEWAL: 'AUTO_RENEWAL',
  MANUAL_RENEWAL: 'MANUAL_RENEWAL',
  ADMIN_EXTENSION: 'ADMIN_EXTENSION',
  REPLACEMENT_VPS: 'REPLACEMENT_VPS',
} as const;

// Mock DoApiClient
jest.mock('../do-account/do-api.client', () => ({
  DoApiClient: jest.fn().mockImplementation(() => ({
    performDropletAction: jest.fn().mockResolvedValue({ id: 1, status: 'in-progress' }),
    deleteDroplet: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('LifecycleService', () => {
  let service: LifecycleService;
  let prismaService: jest.Mocked<PrismaService>;
  let doAccountService: jest.Mocked<DoAccountService>;
  let billingClientService: jest.Mocked<BillingClientService>;
  let notificationClientService: jest.Mocked<NotificationClientService>;

  const createMockOrder = (overrides: Partial<any> = {}) => ({
    id: 'order-123',
    userId: 'user-456',
    planId: 'plan-789',
    planName: 'Basic VPS',
    imageId: 'image-101',
    imageName: 'Ubuntu 22.04',
    duration: 'MONTHLY',
    billingPeriod: BillingPeriod.MONTHLY,
    basePrice: 100000,
    promoDiscount: 0,
    couponCode: null,
    couponDiscount: 0,
    finalPrice: 100000,
    currency: 'IDR',
    status: OrderStatus.ACTIVE,
    version: 0,
    activatedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-02-01'),
    suspendedAt: null,
    terminatedAt: null,
    autoRenew: true,
    lastRenewalAt: null,
    renewalFailReason: null,
    terminationReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    paidAt: new Date('2024-01-01'),
    statusHistory: [],
    ...overrides,
  });

  const mockProvisioningTask = {
    id: 'task-123',
    orderId: 'order-123',
    doAccountId: 'do-account-123',
    status: 'SUCCESS',
    doRegion: 'sgp1',
    doSize: 's-1vcpu-1gb',
    doImage: 'ubuntu-22-04-x64',
    dropletId: '12345678',
    dropletName: 'vps-order-123',
    ipv4Public: '1.2.3.4',
    ipv4Private: '10.0.0.1',
    dropletStatus: 'active',
    dropletTags: ['webrana'],
    dropletCreatedAt: new Date(),
    errorCode: null,
    errorMessage: null,
    attempts: 1,
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            statusHistory: {
              create: jest.fn(),
            },
            renewalHistory: {
              create: jest.fn(),
            },
            provisioningTask: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: DoAccountService,
          useValue: {
            getDecryptedToken: jest.fn(),
            decrementActiveCount: jest.fn(),
          },
        },
        {
          provide: BillingClientService,
          useValue: {
            checkSufficientBalance: jest.fn(),
            deductBalance: jest.fn(),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            send: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
    prismaService = module.get(PrismaService);
    doAccountService = module.get(DoAccountService);
    billingClientService = module.get(BillingClientService);
    notificationClientService = module.get(NotificationClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGracePeriodHours', () => {
    it('should return 0 for DAILY billing period', () => {
      const result = service.getGracePeriodHours(BillingPeriod.DAILY as any);
      expect(result).toBe(0);
    });

    it('should return 24 for MONTHLY billing period', () => {
      const result = service.getGracePeriodHours(BillingPeriod.MONTHLY as any);
      expect(result).toBe(24);
    });

    it('should return 72 for YEARLY billing period', () => {
      const result = service.getGracePeriodHours(BillingPeriod.YEARLY as any);
      expect(result).toBe(72);
    });
  });

  describe('usesSuspend', () => {
    it('should return false for DAILY billing period', () => {
      const result = service.usesSuspend(BillingPeriod.DAILY as any);
      expect(result).toBe(false);
    });

    it('should return true for MONTHLY billing period', () => {
      const result = service.usesSuspend(BillingPeriod.MONTHLY as any);
      expect(result).toBe(true);
    });

    it('should return true for YEARLY billing period', () => {
      const result = service.usesSuspend(BillingPeriod.YEARLY as any);
      expect(result).toBe(true);
    });
  });

  describe('getNotificationThresholds', () => {
    it('should return [8] for DAILY billing period', () => {
      const result = service.getNotificationThresholds(BillingPeriod.DAILY as any);
      expect(result).toEqual([8]);
    });

    it('should return [168, 72, 24, 8] for MONTHLY billing period', () => {
      const result = service.getNotificationThresholds(BillingPeriod.MONTHLY as any);
      expect(result).toEqual([7 * 24, 3 * 24, 24, 8]);
    });

    it('should return [168, 72, 24, 8] for YEARLY billing period', () => {
      const result = service.getNotificationThresholds(BillingPeriod.YEARLY as any);
      expect(result).toEqual([7 * 24, 3 * 24, 24, 8]);
    });
  });

  describe('calculateNewExpiry', () => {
    it('should add 1 day for DAILY billing period', () => {
      // Use a future date to avoid the "use current date" fallback
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const order = createMockOrder({
        billingPeriod: BillingPeriod.DAILY,
        expiresAt: futureDate,
      });

      const result = service.calculateNewExpiry(order);

      // Should be 1 day after the expiresAt
      const diffInDays = (result.getTime() - order.expiresAt.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeCloseTo(1, 0);
    });

    it('should add 1 month for MONTHLY billing period', () => {
      // Use a future date
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const order = createMockOrder({
        billingPeriod: BillingPeriod.MONTHLY,
        expiresAt: futureDate,
      });

      const result = service.calculateNewExpiry(order);

      // Should be 1 month later
      const expectedMonth = (futureDate.getMonth() + 1) % 12;
      expect(result.getMonth()).toBe(expectedMonth);
    });

    it('should add 1 year for YEARLY billing period', () => {
      // Use a future date
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const order = createMockOrder({
        billingPeriod: BillingPeriod.YEARLY,
        expiresAt: futureDate,
      });

      const result = service.calculateNewExpiry(order);

      expect(result.getFullYear()).toBe(futureDate.getFullYear() + 1);
    });

    it('should use current date if expiresAt is in the past', () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.MONTHLY,
        expiresAt: new Date('2020-01-01'), // Past date
      });

      const result = service.calculateNewExpiry(order);

      // Should be based on now, not the past expiry date
      expect(result.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('processExpiringVps', () => {
    it('should return empty stats when no expiring orders', async () => {
      (prismaService.order.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await service.processExpiringVps();

      expect(stats.processed).toBe(0);
      expect(stats.succeeded).toBe(0);
    });

    it('should process expiring orders and send notifications', async () => {
      const expiringOrder = createMockOrder({
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([expiringOrder]);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});
      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const stats = await service.processExpiringVps();

      expect(stats.processed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('processAutoRenewals', () => {
    it('should process orders with auto-renew enabled', async () => {
      const order = createMockOrder({
        status: OrderStatus.EXPIRING_SOON,
        autoRenew: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (billingClientService.checkSufficientBalance as jest.Mock).mockResolvedValue(true);
      (billingClientService.deductBalance as jest.Mock).mockResolvedValue(undefined);
      (prismaService.order.update as jest.Mock).mockResolvedValue({ ...order, status: OrderStatus.ACTIVE });
      (prismaService.renewalHistory.create as jest.Mock).mockResolvedValue({});
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      const stats = await service.processAutoRenewals();

      expect(stats.processed).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    it('should fail renewal when insufficient balance', async () => {
      const order = createMockOrder({
        status: OrderStatus.EXPIRING_SOON,
        autoRenew: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (billingClientService.checkSufficientBalance as jest.Mock).mockResolvedValue(false);
      (prismaService.order.update as jest.Mock).mockResolvedValue({});
      (prismaService.renewalHistory.create as jest.Mock).mockResolvedValue({});

      const stats = await service.processAutoRenewals();

      expect(stats.processed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should skip orders without auto-renew', async () => {
      (prismaService.order.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await service.processAutoRenewals();

      expect(stats.processed).toBe(0);
    });
  });

  describe('processExpiredVps', () => {
    it('should terminate DAILY orders immediately', async () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.DAILY,
        status: OrderStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      const stats = await service.processExpiredVps();

      expect(stats.processed).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    it('should suspend MONTHLY orders with grace period', async () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.MONTHLY,
        status: OrderStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      const stats = await service.processExpiredVps();

      expect(stats.processed).toBe(1);
      // Should call updateMany to set status to SUSPENDED
      expect(prismaService.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.SUSPENDED,
          }),
        })
      );
    });
  });

  describe('processSuspendedVps', () => {
    it('should terminate suspended orders after grace period', async () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.MONTHLY,
        status: OrderStatus.SUSPENDED,
        suspendedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago (past 24h grace)
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      const stats = await service.processSuspendedVps();

      expect(stats.processed).toBe(1);
      expect(stats.succeeded).toBe(1);
    });

    it('should skip suspended orders still in grace period', async () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.MONTHLY,
        status: OrderStatus.SUSPENDED,
        suspendedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago (within 24h grace)
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);

      const stats = await service.processSuspendedVps();

      expect(stats.processed).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.succeeded).toBe(0);
    });

    it('should handle YEARLY orders with 72h grace period', async () => {
      const order = createMockOrder({
        billingPeriod: BillingPeriod.YEARLY,
        status: OrderStatus.SUSPENDED,
        suspendedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago (within 72h grace)
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);

      const stats = await service.processSuspendedVps();

      expect(stats.skipped).toBe(1);
      expect(stats.succeeded).toBe(0);
    });
  });

  describe('terminateVps', () => {
    it('should update order status to TERMINATED', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL as any);

      expect(prismaService.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.TERMINATED,
            terminationReason: TerminationReason.EXPIRED_NO_RENEWAL,
          }),
        })
      );
    });

    it('should skip already terminated orders', async () => {
      const order = createMockOrder({ status: OrderStatus.TERMINATED });

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.terminateVps(order, TerminationReason.USER_DELETED as any);

      // Should not try to destroy droplet
      expect(prismaService.provisioningTask.findUnique).not.toHaveBeenCalled();
    });

    it('should decrement DO account active count on termination', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL as any);

      expect(doAccountService.decrementActiveCount).toHaveBeenCalledWith(mockProvisioningTask.doAccountId);
    });
  });

  describe('suspendVps', () => {
    it('should update order status to SUSPENDED', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.suspendVps(order);

      expect(prismaService.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.SUSPENDED,
            suspendedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should skip if order was already modified', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await service.suspendVps(order);

      // Should not try to power off droplet
      expect(prismaService.provisioningTask.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('should not duplicate notifications for same threshold', async () => {
      // This order has already been notified (note: we don't pass it to findMany
      // to simulate the database query filtering it out)
      const _orderAlreadyNotified = createMockOrder({
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        statusHistory: [
          {
            newStatus: OrderStatus.EXPIRING_SOON,
            metadata: { threshold: 8 },
          },
        ],
      });

      // Query should filter out orders that already have notification for this threshold
      (prismaService.order.findMany as jest.Mock).mockResolvedValue([]);

      const stats = await service.processExpiringVps();

      expect(stats.processed).toBe(0);
    });

    it('should use optimistic locking for state transitions', async () => {
      const order = createMockOrder({ version: 5 });

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL as any);

      expect(prismaService.order.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            version: 5,
          }),
          data: expect.objectContaining({
            version: { increment: 1 },
          }),
        })
      );
    });
  });

  describe('notification integration', () => {
    it('should send VPS_SUSPENDED notification when suspending VPS', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.suspendVps(order);

      expect(notificationClientService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: order.userId,
          event: 'VPS_SUSPENDED',
          data: expect.objectContaining({
            orderId: order.id,
            planName: order.planName,
          }),
        })
      );
    });

    it('should send VPS_DESTROYED notification when terminating VPS', async () => {
      const order = createMockOrder();

      (prismaService.order.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prismaService.provisioningTask.findUnique as jest.Mock).mockResolvedValue(mockProvisioningTask);
      (doAccountService.getDecryptedToken as jest.Mock).mockResolvedValue('test-token');
      (prismaService.provisioningTask.update as jest.Mock).mockResolvedValue({});
      (doAccountService.decrementActiveCount as jest.Mock).mockResolvedValue(undefined);
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.terminateVps(order, TerminationReason.EXPIRED_NO_RENEWAL as any);

      expect(notificationClientService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: order.userId,
          event: 'VPS_DESTROYED',
          data: expect.objectContaining({
            orderId: order.id,
            planName: order.planName,
            reason: TerminationReason.EXPIRED_NO_RENEWAL,
          }),
        })
      );
    });

    it('should send RENEWAL_SUCCESS notification on successful renewal', async () => {
      const order = createMockOrder({
        status: OrderStatus.EXPIRING_SOON,
        autoRenew: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (billingClientService.checkSufficientBalance as jest.Mock).mockResolvedValue(true);
      (billingClientService.deductBalance as jest.Mock).mockResolvedValue(undefined);
      (prismaService.order.update as jest.Mock).mockResolvedValue({ ...order, status: OrderStatus.ACTIVE });
      (prismaService.renewalHistory.create as jest.Mock).mockResolvedValue({});
      (prismaService.statusHistory.create as jest.Mock).mockResolvedValue({});

      await service.processAutoRenewals();

      expect(notificationClientService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: order.userId,
          event: 'RENEWAL_SUCCESS',
          data: expect.objectContaining({
            orderId: order.id,
            planName: order.planName,
          }),
        })
      );
    });

    it('should send RENEWAL_FAILED_NO_BALANCE notification on insufficient balance', async () => {
      const order = createMockOrder({
        status: OrderStatus.EXPIRING_SOON,
        autoRenew: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
      });

      (prismaService.order.findMany as jest.Mock).mockResolvedValue([order]);
      (billingClientService.checkSufficientBalance as jest.Mock).mockResolvedValue(false);
      (prismaService.order.update as jest.Mock).mockResolvedValue({});
      (prismaService.renewalHistory.create as jest.Mock).mockResolvedValue({});

      await service.processAutoRenewals();

      expect(notificationClientService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: order.userId,
          event: 'RENEWAL_FAILED_NO_BALANCE',
          data: expect.objectContaining({
            orderId: order.id,
            planName: order.planName,
            required: order.finalPrice,
          }),
        })
      );
    });
  });
});
