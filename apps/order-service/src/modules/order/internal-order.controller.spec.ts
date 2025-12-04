import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, ProvisioningStatus, PlanDuration } from '@prisma/client';

import { OrderNotFoundException, PaymentStatusConflictException } from '../../common/exceptions';

import { InternalOrderController } from './internal-order.controller';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';



describe('InternalOrderController', () => {
  let controller: InternalOrderController;
  let orderService: jest.Mocked<OrderService>;
  let paymentService: jest.Mocked<PaymentService>;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-456',
    status: OrderStatus.PENDING_PAYMENT,
    planId: 'plan-abc',
    planName: 'Basic VPS',
    imageId: 'image-xyz',
    imageName: 'Ubuntu 22.04',
    duration: PlanDuration.MONTHLY,
    basePrice: 100000,
    promoDiscount: 0,
    couponCode: null,
    couponDiscount: 0,
    finalPrice: 100000,
    currency: 'IDR',
    paidAt: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    items: [
      {
        id: 'item-001',
        itemType: 'PLAN',
        referenceId: 'plan-abc',
        description: 'Basic VPS Plan',
        unitPrice: 100000,
        quantity: 1,
        totalPrice: 100000,
      },
    ],
    provisioningTask: null,
    statusHistory: [
      {
        id: 'history-001',
        previousStatus: null,
        newStatus: 'PENDING_PAYMENT',
        actor: 'system',
        reason: 'Order created',
        metadata: {},
        createdAt: new Date('2024-01-15T10:00:00Z'),
      },
    ],
  };

  const mockActiveOrder = {
    ...mockOrder,
    status: OrderStatus.ACTIVE,
    paidAt: new Date('2024-01-15T11:00:00Z'),
    provisioningTask: {
      id: 'task-001',
      status: ProvisioningStatus.SUCCESS,
      dropletId: '12345678',
      dropletName: 'vps-order-12',
      dropletStatus: 'active',
      ipv4Public: '143.198.123.45',
      ipv4Private: '10.130.0.2',
      doRegion: 'sgp1',
      doSize: 's-1vcpu-1gb',
      doImage: 'ubuntu-22-04-x64',
      errorCode: null,
      errorMessage: null,
      attempts: 5,
      startedAt: new Date('2024-01-15T11:01:00Z'),
      completedAt: new Date('2024-01-15T11:05:00Z'),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalOrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            getAllOrders: jest.fn(),
            getOrderByIdAdmin: jest.fn(),
            retryProvisioning: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            updatePaymentStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'INTERNAL_API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<InternalOrderController>(InternalOrderController);
    orderService = module.get(OrderService);
    paymentService = module.get(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /internal/orders/:id/payment-status', () => {
    it('should update payment status to PAID', async () => {
      paymentService.updatePaymentStatus.mockResolvedValue({
        id: 'order-123',
        status: OrderStatus.PAID,
        previousStatus: OrderStatus.PENDING_PAYMENT,
        paidAt: new Date('2024-01-15T11:00:00Z'),
      });

      const result = await controller.updatePaymentStatus('order-123', {
        status: 'PAID',
        notes: 'Payment confirmed via bank transfer',
      });

      expect(paymentService.updatePaymentStatus).toHaveBeenCalledWith(
        'order-123',
        { status: 'PAID', notes: 'Payment confirmed via bank transfer' },
        'admin'
      );
      expect(result.data).toMatchObject({
        id: 'order-123',
        status: 'PAID',
        previousStatus: 'PENDING_PAYMENT',
      });
      expect(result.data.paidAt).toBeTruthy();
    });

    it('should update payment status to PAYMENT_FAILED', async () => {
      paymentService.updatePaymentStatus.mockResolvedValue({
        id: 'order-123',
        status: OrderStatus.PENDING_PAYMENT, // Still PENDING_PAYMENT
        previousStatus: OrderStatus.PENDING_PAYMENT,
        paidAt: null,
      });

      const result = await controller.updatePaymentStatus('order-123', {
        status: 'PAYMENT_FAILED',
        notes: 'Payment declined by bank',
      });

      expect(result.data.status).toBe('PENDING_PAYMENT');
      expect(result.data.paidAt).toBeNull();
    });
  });

  describe('GET /internal/orders', () => {
    it('should return paginated list of all orders', async () => {
      orderService.getAllOrders.mockResolvedValue({
        data: [mockOrder as any],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const result = await controller.listOrders({ page: 1, limit: 10 });

      expect(orderService.getAllOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'order-123',
        userId: 'user-456',
        status: 'PENDING_PAYMENT',
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      orderService.getAllOrders.mockResolvedValue({
        data: [mockActiveOrder as any],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await controller.listOrders({
        page: 1,
        limit: 10,
        status: OrderStatus.ACTIVE,
      });

      expect(orderService.getAllOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
      });
    });

    it('should filter by userId', async () => {
      orderService.getAllOrders.mockResolvedValue({
        data: [mockOrder as any],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      await controller.listOrders({
        page: 1,
        limit: 10,
        userId: 'user-456',
      });

      expect(orderService.getAllOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        userId: 'user-456',
      });
    });
  });

  describe('GET /internal/orders/:id', () => {
    it('should return order detail with provisioning task', async () => {
      orderService.getOrderByIdAdmin.mockResolvedValue(mockActiveOrder as any);

      const result = await controller.getOrderDetail('order-123');

      expect(orderService.getOrderByIdAdmin).toHaveBeenCalledWith('order-123');
      expect(result.data).toMatchObject({
        id: 'order-123',
        status: 'ACTIVE',
        provisioningTask: {
          dropletId: '12345678',
          ipv4Public: '143.198.123.45',
          status: 'SUCCESS',
        },
      });
    });

    it('should return order detail with status history', async () => {
      orderService.getOrderByIdAdmin.mockResolvedValue(mockOrder as any);

      const result = await controller.getOrderDetail('order-123');

      expect(result.data.statusHistory).toHaveLength(1);
      expect(result.data.statusHistory[0]).toMatchObject({
        newStatus: 'PENDING_PAYMENT',
        actor: 'system',
      });
    });

    it('should throw OrderNotFoundException for non-existent order', async () => {
      orderService.getOrderByIdAdmin.mockRejectedValue(
        new OrderNotFoundException('non-existent')
      );

      await expect(
        controller.getOrderDetail('non-existent')
      ).rejects.toThrow(OrderNotFoundException);
    });
  });

  describe('POST /internal/orders/:id/retry-provisioning', () => {
    const mockFailedOrder = {
      ...mockOrder,
      status: OrderStatus.FAILED,
      provisioningTask: {
        ...mockActiveOrder.provisioningTask,
        status: ProvisioningStatus.FAILED,
        errorCode: 'DROPLET_CREATION_FAILED',
        errorMessage: 'Failed to create droplet',
      },
    };

    it('should initiate retry provisioning for failed order', async () => {
      orderService.retryProvisioning.mockResolvedValue({
        message: 'Provisioning retry initiated',
        orderId: 'order-123',
        newStatus: OrderStatus.PROCESSING,
      });

      const result = await controller.retryProvisioning('order-123');

      expect(orderService.retryProvisioning).toHaveBeenCalledWith(
        'order-123',
        'admin'
      );
      expect(result.data).toMatchObject({
        message: 'Provisioning retry initiated',
        orderId: 'order-123',
        newStatus: 'PROCESSING',
      });
      expect(result.data.retryInitiatedAt).toBeTruthy();
    });

    it('should throw OrderNotFoundException for non-existent order', async () => {
      orderService.retryProvisioning.mockRejectedValue(
        new OrderNotFoundException('non-existent')
      );

      await expect(
        controller.retryProvisioning('non-existent')
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should throw PaymentStatusConflictException for non-FAILED order', async () => {
      orderService.retryProvisioning.mockRejectedValue(
        new PaymentStatusConflictException('ACTIVE', 'PROCESSING')
      );

      await expect(
        controller.retryProvisioning('order-123')
      ).rejects.toThrow(PaymentStatusConflictException);
    });

    it('should throw error when order has no provisioning task', async () => {
      orderService.retryProvisioning.mockRejectedValue(
        new PaymentStatusConflictException('FAILED', 'PROCESSING')
      );

      await expect(
        controller.retryProvisioning('order-123')
      ).rejects.toThrow(PaymentStatusConflictException);
    });
  });
});
