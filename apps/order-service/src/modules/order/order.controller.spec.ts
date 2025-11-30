import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConfigService } from '@nestjs/config';
import { PlanDuration, OrderStatus, ProvisioningStatus } from '@prisma/client';
import { 
  OrderNotFoundException, 
  OrderAccessDeniedException,
  OrderNotActiveException,
  DropletNotReadyException,
} from '../../common/exceptions';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  const mockUser = {
    userId: 'user-123',
    email: 'user@example.com',
    role: 'user',
  };

  const mockOrder = {
    id: 'order-456',
    userId: 'user-123',
    status: OrderStatus.PENDING_PAYMENT,
    basePrice: 10000,
    promoDiscount: 0,
    couponDiscount: 0,
    finalPrice: 10000,
    currency: 'IDR',
    paidAt: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    items: [
      {
        id: 'item-789',
        orderId: 'order-456',
        itemType: 'PLAN',
        refId: 'plan-abc',
        refName: 'Basic VPS',
        unitPrice: 10000,
        quantity: 1,
        createdAt: new Date(),
      },
    ],
    provisioningTask: null,
  };

  const mockActiveOrder = {
    ...mockOrder,
    status: OrderStatus.ACTIVE,
    paidAt: new Date('2024-01-15T11:00:00Z'),
    provisioningTask: {
      id: 'task-001',
      orderId: 'order-456',
      status: ProvisioningStatus.SUCCESS,
      dropletId: '12345678',
      dropletName: 'vps-order-45',
      dropletStatus: 'active',
      ipv4Public: '143.198.123.45',
      ipv4Private: '10.130.0.2',
      doRegion: 'sgp1',
      doSize: 's-1vcpu-1gb',
      doImage: 'ubuntu-22-04-x64',
      dropletTags: ['webrana'],
      dropletCreatedAt: new Date('2024-01-15T11:05:00Z'),
      errorCode: null,
      errorMessage: null,
      attempts: 5,
      startedAt: new Date('2024-01-15T11:01:00Z'),
      completedAt: new Date('2024-01-15T11:05:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        JWT_SECRET: 'test-secret',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            createOrder: jest.fn(),
            getOrdersByUserId: jest.fn(),
            getOrderById: jest.fn(),
            getConsoleUrl: jest.fn(),
            powerAction: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /orders (createOrder)', () => {
    const createOrderDto = {
      planId: 'plan-abc',
      imageId: 'image-xyz',
      duration: PlanDuration.MONTHLY,
      couponCode: undefined,
    };

    it('should create order successfully with data envelope', async () => {
      orderService.createOrder.mockResolvedValue(mockOrder as any);

      const result = await controller.createOrder(mockUser, createOrderDto);

      expect(orderService.createOrder).toHaveBeenCalledWith(
        'user-123',
        createOrderDto
      );
      // Verify response has data envelope
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({
        id: 'order-456',
        status: 'PENDING_PAYMENT',
        pricing: {
          basePrice: 10000,
          promoDiscount: 0,
          couponDiscount: 0,
          finalPrice: 10000,
          currency: 'IDR',
        },
        items: mockOrder.items,
        createdAt: mockOrder.createdAt,
      });
    });

    it('should create order with coupon code', async () => {
      const dtoWithCoupon = { ...createOrderDto, couponCode: 'SAVE10' };
      const orderWithDiscount = {
        ...mockOrder,
        couponDiscount: 1000,
        finalPrice: 9000,
      };
      orderService.createOrder.mockResolvedValue(orderWithDiscount as any);

      const result = await controller.createOrder(mockUser, dtoWithCoupon);

      expect(orderService.createOrder).toHaveBeenCalledWith(
        'user-123',
        dtoWithCoupon
      );
      // Verify data envelope
      expect(result).toHaveProperty('data');
      expect(result.data.pricing.couponDiscount).toBe(1000);
      expect(result.data.pricing.finalPrice).toBe(9000);
    });
  });

  describe('GET /orders (getMyOrders)', () => {
    const paginatedResult = {
      data: [mockOrder],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return paginated orders', async () => {
      orderService.getOrdersByUserId.mockResolvedValue(paginatedResult as any);

      const result = await controller.getMyOrders('user-123', {
        page: 1,
        limit: 10,
      });

      expect(orderService.getOrdersByUserId).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 10,
      });
      expect(result).toEqual(paginatedResult);
    });

    it('should filter by status', async () => {
      const activeOrders = {
        data: [mockActiveOrder],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      orderService.getOrdersByUserId.mockResolvedValue(activeOrders as any);

      const result = await controller.getMyOrders('user-123', {
        page: 1,
        limit: 10,
        status: OrderStatus.ACTIVE,
      });

      expect(orderService.getOrdersByUserId).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      });
      expect(result.data[0].status).toBe('ACTIVE');
    });
  });

  describe('GET /orders/:id (getOrderById)', () => {
    it('should return order with data envelope and provisioning task', async () => {
      orderService.getOrderById.mockResolvedValue(mockActiveOrder as any);

      const result = await controller.getOrderById('user-123', 'order-456');

      expect(orderService.getOrderById).toHaveBeenCalledWith(
        'order-456',
        'user-123'
      );
      // Verify data envelope
      expect(result).toHaveProperty('data');
      expect(result.data).toMatchObject({
        id: 'order-456',
        status: 'ACTIVE',
        provisioningTask: {
          dropletId: '12345678',
          ipv4Public: '143.198.123.45',
          status: 'SUCCESS',
        },
      });
    });

    it('should return order without provisioning task', async () => {
      orderService.getOrderById.mockResolvedValue(mockOrder as any);

      const result = await controller.getOrderById('user-123', 'order-456');

      expect(result).toHaveProperty('data');
      expect(result.data.provisioningTask).toBeNull();
    });

    it('should throw OrderNotFoundException for non-existent order', async () => {
      orderService.getOrderById.mockRejectedValue(
        new OrderNotFoundException('non-existent')
      );

      await expect(
        controller.getOrderById('user-123', 'non-existent')
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should throw OrderAccessDeniedException for other user order', async () => {
      orderService.getOrderById.mockRejectedValue(
        new OrderAccessDeniedException('order-456')
      );

      await expect(
        controller.getOrderById('other-user', 'order-456')
      ).rejects.toThrow(OrderAccessDeniedException);
    });
  });

  // ==========================================
  // VPS Console & Power Control Tests
  // ==========================================

  describe('GET /orders/:id/console (getConsoleUrl)', () => {
    const mockConsoleResponse = {
      url: 'https://console.digitalocean.com/droplets/12345678/console',
      expiresAt: '2024-01-15T12:00:00.000Z',
    };

    it('should return console URL successfully', async () => {
      orderService.getConsoleUrl.mockResolvedValue(mockConsoleResponse);

      const result = await controller.getConsoleUrl('user-123', 'order-456');

      expect(orderService.getConsoleUrl).toHaveBeenCalledWith('order-456', 'user-123');
      expect(result).toEqual({ data: mockConsoleResponse });
      expect(result.data).toHaveProperty('url');
      expect(result.data).toHaveProperty('expiresAt');
    });

    it('should throw OrderNotActiveException if order is not active', async () => {
      orderService.getConsoleUrl.mockRejectedValue(
        new OrderNotActiveException('order-456')
      );

      await expect(
        controller.getConsoleUrl('user-123', 'order-456')
      ).rejects.toThrow(OrderNotActiveException);
    });

    it('should throw DropletNotReadyException if droplet not provisioned', async () => {
      orderService.getConsoleUrl.mockRejectedValue(
        new DropletNotReadyException('order-456')
      );

      await expect(
        controller.getConsoleUrl('user-123', 'order-456')
      ).rejects.toThrow(DropletNotReadyException);
    });

    it('should throw OrderNotFoundException for non-existent order', async () => {
      orderService.getConsoleUrl.mockRejectedValue(
        new OrderNotFoundException('non-existent')
      );

      await expect(
        controller.getConsoleUrl('user-123', 'non-existent')
      ).rejects.toThrow(OrderNotFoundException);
    });
  });

  describe('POST /orders/:id/power-on (powerOn)', () => {
    it('should power on VPS successfully', async () => {
      orderService.powerAction.mockResolvedValue(undefined);

      const result = await controller.powerOn('user-123', 'order-456');

      expect(orderService.powerAction).toHaveBeenCalledWith('order-456', 'user-123', 'power_on');
      expect(result).toEqual({ 
        data: { success: true, message: 'VPS sedang dinyalakan' } 
      });
    });

    it('should throw OrderNotActiveException if order is not active', async () => {
      orderService.powerAction.mockRejectedValue(
        new OrderNotActiveException('order-456')
      );

      await expect(
        controller.powerOn('user-123', 'order-456')
      ).rejects.toThrow(OrderNotActiveException);
    });

    it('should throw DropletNotReadyException if droplet not provisioned', async () => {
      orderService.powerAction.mockRejectedValue(
        new DropletNotReadyException('order-456')
      );

      await expect(
        controller.powerOn('user-123', 'order-456')
      ).rejects.toThrow(DropletNotReadyException);
    });
  });

  describe('POST /orders/:id/power-off (powerOff)', () => {
    it('should power off VPS successfully', async () => {
      orderService.powerAction.mockResolvedValue(undefined);

      const result = await controller.powerOff('user-123', 'order-456');

      expect(orderService.powerAction).toHaveBeenCalledWith('order-456', 'user-123', 'power_off');
      expect(result).toEqual({ 
        data: { success: true, message: 'VPS sedang dimatikan' } 
      });
    });

    it('should throw OrderNotActiveException if order is not active', async () => {
      orderService.powerAction.mockRejectedValue(
        new OrderNotActiveException('order-456')
      );

      await expect(
        controller.powerOff('user-123', 'order-456')
      ).rejects.toThrow(OrderNotActiveException);
    });
  });

  describe('POST /orders/:id/reboot (reboot)', () => {
    it('should reboot VPS successfully', async () => {
      orderService.powerAction.mockResolvedValue(undefined);

      const result = await controller.reboot('user-123', 'order-456');

      expect(orderService.powerAction).toHaveBeenCalledWith('order-456', 'user-123', 'reboot');
      expect(result).toEqual({ 
        data: { success: true, message: 'VPS sedang di-reboot' } 
      });
    });

    it('should throw OrderNotActiveException if order is not active', async () => {
      orderService.powerAction.mockRejectedValue(
        new OrderNotActiveException('order-456')
      );

      await expect(
        controller.reboot('user-123', 'order-456')
      ).rejects.toThrow(OrderNotActiveException);
    });

    it('should throw DropletNotReadyException if droplet not provisioned', async () => {
      orderService.powerAction.mockRejectedValue(
        new DropletNotReadyException('order-456')
      );

      await expect(
        controller.reboot('user-123', 'order-456')
      ).rejects.toThrow(DropletNotReadyException);
    });
  });
});
