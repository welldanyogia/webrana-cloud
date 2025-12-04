import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PlanDuration, BillingPeriod, ItemType } from '@prisma/client';

import {
  OrderNotFoundException,
  OrderAccessDeniedException,
  InvalidDurationException,
  InvalidBillingPeriodException,
  PaymentStatusConflictException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingClientService } from '../billing-client/billing-client.service';
import { CatalogClientService } from '../catalog-client/catalog-client.service';
import { DoAccountService } from '../do-account/do-account.service';

import { CreateOrderDto } from './dto';
import { OrderStateMachine } from './order-state-machine';
import { OrderService } from './order.service';



describe('OrderService', () => {
  let service: OrderService;
  let prismaService: PrismaService;
  let catalogClientService: CatalogClientService;

  const mockPlan = {
    id: 'plan-123',
    name: 'vps-basic',
    displayName: 'VPS Basic',
    description: 'Basic VPS',
    cpu: 1,
    memoryMb: 1024,
    diskGb: 25,
    bandwidthTb: 1,
    provider: 'digitalocean',
    providerSizeSlug: 's-1vcpu-1gb',
    isActive: true,
    sortOrder: 1,
    tags: [],
    // New billing period pricing fields
    priceDaily: 10000,
    priceMonthly: 150000,
    priceYearly: 1500000,
    allowDaily: true,
    allowMonthly: true,
    allowYearly: true,
    // Legacy pricings for backward compat
    pricings: [
      {
        id: 'pricing-1',
        duration: 'MONTHLY',
        price: 150000,
        cost: 100000,
        isActive: true,
      },
    ],
    promos: [
      {
        id: 'promo-1',
        name: 'Launch Promo',
        discountType: 'PERCENT' as const,
        discountValue: 10,
        startDate: new Date(Date.now() - 86400000).toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
        isActive: true,
      },
    ],
  };

  const mockImage = {
    id: 'image-123',
    provider: 'digitalocean',
    providerSlug: 'ubuntu-22-04-x64',
    displayName: 'Ubuntu 22.04 LTS',
    description: 'Ubuntu 22.04',
    category: 'OS' as const,
    version: '22.04',
    isActive: true,
    sortOrder: 1,
  };

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    planId: 'plan-123',
    planName: 'VPS Basic',
    imageId: 'image-123',
    imageName: 'Ubuntu 22.04 LTS',
    duration: PlanDuration.MONTHLY,
    billingPeriod: BillingPeriod.MONTHLY,
    basePrice: 150000,
    promoDiscount: 15000,
    couponCode: null,
    couponDiscount: 0,
    finalPrice: 135000,
    currency: 'IDR',
    status: OrderStatus.PENDING_PAYMENT,
    version: 0,
    autoRenew: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
    activatedAt: null,
    expiresAt: null,
    suspendedAt: null,
    terminatedAt: null,
  };

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
    },
    statusHistory: {
      create: jest.fn(),
    },
    renewalHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockCatalogClientService = {
    getPlanById: jest.fn(),
    getImageById: jest.fn(),
    validateCoupon: jest.fn(),
  };

  const mockBillingClientService = {
    getBalance: jest.fn().mockResolvedValue(500000),
    checkSufficientBalance: jest.fn().mockResolvedValue(true),
    deductBalance: jest.fn().mockResolvedValue(undefined),
    refundBalance: jest.fn().mockResolvedValue(undefined),
  };

  const mockDoAccountService = {
    getDecryptedToken: jest.fn().mockResolvedValue('mock-do-token'),
    selectAvailableAccount: jest.fn().mockResolvedValue({ id: 'do-account-123' }),
    incrementActiveCount: jest.fn().mockResolvedValue(undefined),
    decrementActiveCount: jest.fn().mockResolvedValue(undefined),
    getDropletConsoleUrl: jest.fn().mockResolvedValue({ 
      url: 'https://console.digitalocean.com/test', 
      expiresAt: new Date().toISOString() 
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CatalogClientService,
          useValue: mockCatalogClientService,
        },
        {
          provide: BillingClientService,
          useValue: mockBillingClientService,
        },
        {
          provide: DoAccountService,
          useValue: mockDoAccountService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prismaService = module.get<PrismaService>(PrismaService);
    catalogClientService = module.get<CatalogClientService>(CatalogClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      planId: 'plan-123',
      imageId: 'image-123',
      billingPeriod: BillingPeriod.MONTHLY,
    };

    it('should create an order with pricing snapshot from catalog', async () => {
      mockCatalogClientService.getPlanById.mockResolvedValue(mockPlan);
      mockCatalogClientService.getImageById.mockResolvedValue(mockImage);
      mockPrismaService.order.create.mockResolvedValue(mockOrder);
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [],
        provisioningTask: null,
        statusHistory: [],
      });

      const result = await service.createOrder('user-123', createOrderDto);

      expect(catalogClientService.getPlanById).toHaveBeenCalledWith('plan-123');
      expect(catalogClientService.getImageById).toHaveBeenCalledWith('image-123');
      expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('should validate coupon via catalog-service when provided', async () => {
      const dtoWithCoupon = { ...createOrderDto, couponCode: 'HEMAT20' };
      mockCatalogClientService.getPlanById.mockResolvedValue(mockPlan);
      mockCatalogClientService.getImageById.mockResolvedValue(mockImage);
      mockCatalogClientService.validateCoupon.mockResolvedValue({
        valid: true,
        discountAmount: 27000,
        finalPrice: 108000,
        coupon: { code: 'HEMAT20', name: 'Diskon 20%', discountType: 'PERCENT', discountValue: 20 },
      });
      mockPrismaService.order.create.mockResolvedValue({
        ...mockOrder,
        couponCode: 'HEMAT20',
        couponDiscount: 27000,
        finalPrice: 108000,
      });
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        couponCode: 'HEMAT20',
        couponDiscount: 27000,
        finalPrice: 108000,
        items: [],
        provisioningTask: null,
        statusHistory: [],
      });

      await service.createOrder('user-123', dtoWithCoupon);

      expect(catalogClientService.validateCoupon).toHaveBeenCalledWith({
        code: 'HEMAT20',
        planId: 'plan-123',
        userId: 'user-123',
        amount: expect.any(Number),
      });
    });

    it('should throw InvalidBillingPeriodException if billing period not available', async () => {
      // Plan with no pricings at all
      const planNoPricings = { 
        ...mockPlan, 
        pricings: [],  // Empty pricings array
        allowMonthly: false, 
        priceMonthly: null 
      };
      mockCatalogClientService.getPlanById.mockResolvedValue(planNoPricings);
      mockCatalogClientService.getImageById.mockResolvedValue(mockImage);

      await expect(
        service.createOrder('user-123', createOrderDto)
      ).rejects.toThrow(InvalidBillingPeriodException);
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [],
        provisioningTask: null,
        statusHistory: [],
      });

      const result = await service.getOrderById('order-123');

      expect(result.id).toBe('order-123');
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById('invalid-id')).rejects.toThrow(
        OrderNotFoundException
      );
    });

    it('should throw OrderAccessDeniedException when userId does not match', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        items: [],
        provisioningTask: null,
        statusHistory: [],
      });

      await expect(
        service.getOrderById('order-123', 'different-user')
      ).rejects.toThrow(OrderAccessDeniedException);
    });
  });

  describe('getOrdersByUserId', () => {
    it('should return paginated orders for user', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([mockOrder]);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.getOrdersByUserId('user-123', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.getOrdersByUserId('user-123', {
        page: 1,
        limit: 10,
        status: OrderStatus.ACTIVE,
      });

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            status: OrderStatus.ACTIVE,
          }),
        })
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status when transition is valid', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
        paidAt: new Date(),
      });

      const result = await service.updateOrderStatus(
        'order-123',
        OrderStatus.PAID,
        'admin:admin-id',
        'Payment verified'
      );

      expect(result.status).toBe(OrderStatus.PAID);
    });

    it('should throw PaymentStatusConflictException for invalid transition', async () => {
      const activeOrder = { ...mockOrder, status: OrderStatus.ACTIVE };
      mockPrismaService.order.findUnique.mockResolvedValue(activeOrder);

      await expect(
        service.updateOrderStatus(
          'order-123',
          OrderStatus.PAID,
          'admin:admin-id'
        )
      ).rejects.toThrow(PaymentStatusConflictException);
    });

    it('should record status history on transition', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PAID,
      });

      await service.updateOrderStatus(
        'order-123',
        OrderStatus.PAID,
        'admin:admin-id',
        'Test reason'
      );

      expect(mockPrismaService.statusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-123',
            previousStatus: OrderStatus.PENDING_PAYMENT,
            newStatus: OrderStatus.PAID,
            actor: 'admin:admin-id',
          }),
        })
      );
    });
  });
});

describe('OrderStateMachine', () => {
  describe('isValidTransition', () => {
    it('should allow PENDING_PAYMENT -> PAID', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.PAID
        )
      ).toBe(true);
    });

    it('should allow PAID -> PROVISIONING', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.PAID,
          OrderStatus.PROVISIONING
        )
      ).toBe(true);
    });

    it('should allow PROVISIONING -> ACTIVE', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.PROVISIONING,
          OrderStatus.ACTIVE
        )
      ).toBe(true);
    });

    it('should allow PROVISIONING -> FAILED', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.PROVISIONING,
          OrderStatus.FAILED
        )
      ).toBe(true);
    });

    it('should NOT allow ACTIVE -> PAID', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.ACTIVE,
          OrderStatus.PAID
        )
      ).toBe(false);
    });

    it('should NOT allow PENDING_PAYMENT -> ACTIVE (skip states)', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.PENDING_PAYMENT,
          OrderStatus.ACTIVE
        )
      ).toBe(false);
    });
  });

  describe('isTerminalState', () => {
    it('should identify TERMINATED as terminal', () => {
      expect(OrderStateMachine.isTerminalState(OrderStatus.TERMINATED)).toBe(true);
    });

    it('should NOT identify FAILED as terminal (admin can retry provisioning)', () => {
      // FAILED now allows transition to PROCESSING for admin retry
      expect(OrderStateMachine.isTerminalState(OrderStatus.FAILED)).toBe(false);
    });

    it('should allow FAILED -> PROCESSING (admin retry)', () => {
      expect(
        OrderStateMachine.isValidTransition(
          OrderStatus.FAILED,
          OrderStatus.PROCESSING
        )
      ).toBe(true);
    });

    it('should identify CANCELED as terminal', () => {
      expect(OrderStateMachine.isTerminalState(OrderStatus.CANCELED)).toBe(true);
    });

    it('should NOT identify ACTIVE as terminal (can transition to EXPIRING_SOON)', () => {
      expect(OrderStateMachine.isTerminalState(OrderStatus.ACTIVE)).toBe(false);
    });

    it('should NOT identify PENDING_PAYMENT as terminal', () => {
      expect(
        OrderStateMachine.isTerminalState(OrderStatus.PENDING_PAYMENT)
      ).toBe(false);
    });
  });

  describe('retryProvisioning', () => {
    const mockFailedOrder = {
      id: 'order-123',
      userId: 'user-456',
      status: OrderStatus.FAILED,
      planId: 'plan-123',
      finalPrice: 100000,
      provisioningTask: {
        id: 'task-789',
        status: 'FAILED',
        errorCode: 'DROPLET_CREATION_FAILED',
        errorMessage: 'Failed to create droplet',
      },
    };

    it('should reset order to PROCESSING and initiate retry', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockFailedOrder as any);
      prismaService.$transaction.mockImplementation(async (fn) => fn(prismaService));
      prismaService.order.update.mockResolvedValue({
        ...mockFailedOrder,
        status: OrderStatus.PROCESSING,
      } as any);
      prismaService.provisioningTask.update.mockResolvedValue({} as any);
      prismaService.statusHistory.create.mockResolvedValue({} as any);

      const result = await service.retryProvisioning('order-123', 'admin:test');

      expect(result.message).toBe('Provisioning retry initiated');
      expect(result.orderId).toBe('order-123');
      expect(result.newStatus).toBe(OrderStatus.PROCESSING);
      expect(prismaService.order.update).toHaveBeenCalled();
      expect(prismaService.provisioningTask.update).toHaveBeenCalled();
      expect(prismaService.statusHistory.create).toHaveBeenCalled();
    });

    it('should throw OrderNotFoundException for non-existent order', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.retryProvisioning('non-existent', 'admin')
      ).rejects.toThrow('Order not found');
    });

    it('should throw error when order is not in FAILED status', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        ...mockFailedOrder,
        status: OrderStatus.ACTIVE,
      } as any);

      await expect(
        service.retryProvisioning('order-123', 'admin')
      ).rejects.toThrow();
    });

    it('should throw error when order has no provisioning task', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        ...mockFailedOrder,
        provisioningTask: null,
      } as any);

      await expect(
        service.retryProvisioning('order-123', 'admin')
      ).rejects.toThrow();
    });
  });
});
