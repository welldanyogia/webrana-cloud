import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PlanDuration } from '@prisma/client';

import {
  OrderNotFoundException,
  PaymentStatusConflictException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisioningService } from '../provisioning/provisioning.service';

import { UpdatePaymentStatusDto, PaymentStatusUpdate } from './dto';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';




describe('PaymentService', () => {
  let service: PaymentService;
  let prismaService: PrismaService;
  let orderService: OrderService;
  let provisioningService: ProvisioningService;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    planId: 'plan-123',
    planName: 'VPS Basic',
    imageId: 'image-123',
    imageName: 'Ubuntu 22.04 LTS',
    duration: PlanDuration.MONTHLY,
    basePrice: 150000,
    promoDiscount: 15000,
    couponCode: null,
    couponDiscount: 0,
    finalPrice: 135000,
    currency: 'IDR',
    status: OrderStatus.PENDING_PAYMENT,
    createdAt: new Date(),
    updatedAt: new Date(),
    paidAt: null,
  };

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
  };

  const mockOrderService = {
    updateOrderStatus: jest.fn(),
    recordStatusHistory: jest.fn(),
  };

  const mockProvisioningService = {
    startProvisioning: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: ProvisioningService,
          useValue: mockProvisioningService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prismaService = module.get<PrismaService>(PrismaService);
    orderService = module.get<OrderService>(OrderService);
    provisioningService = module.get<ProvisioningService>(ProvisioningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePaymentStatus', () => {
    describe('PAID status', () => {
      it('should mark order as PAID when current status is PENDING_PAYMENT', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAID,
          notes: 'Payment verified',
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockOrderService.updateOrderStatus.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.PAID,
          paidAt: new Date(),
        });

        const result = await service.updatePaymentStatus(
          'order-123',
          dto,
          'admin:admin-id'
        );

        expect(result.status).toBe(OrderStatus.PAID);
        expect(result.paidAt).toBeDefined();
        expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
          'order-123',
          OrderStatus.PAID,
          'admin:admin-id',
          'Payment verified',
          { paymentMethod: 'manual_override' }
        );
      });

      it('should trigger provisioning after PAID status', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAID,
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
        mockOrderService.updateOrderStatus.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.PAID,
          paidAt: new Date(),
        });

        await service.updatePaymentStatus('order-123', dto, 'admin:admin-id');

        // setImmediate is used, so we need to wait for it
        await new Promise((resolve) => setImmediate(resolve));

        expect(provisioningService.startProvisioning).toHaveBeenCalledWith(
          'order-123'
        );
      });

      it('should throw PaymentStatusConflictException if not PENDING_PAYMENT', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAID,
        };

        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.ACTIVE,
        });

        await expect(
          service.updatePaymentStatus('order-123', dto, 'admin:admin-id')
        ).rejects.toThrow(PaymentStatusConflictException);
      });
    });

    describe('PAYMENT_FAILED status', () => {
      it('should record payment failure without changing order status', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAYMENT_FAILED,
          notes: 'Payment declined',
        };

        mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

        const result = await service.updatePaymentStatus(
          'order-123',
          dto,
          'admin:admin-id'
        );

        // Order should still be PENDING_PAYMENT (can retry)
        expect(result.status).toBe(OrderStatus.PENDING_PAYMENT);
        expect(result.paidAt).toBeNull();

        expect(orderService.recordStatusHistory).toHaveBeenCalledWith(
          'order-123',
          OrderStatus.PENDING_PAYMENT,
          'PAYMENT_FAILED',
          'admin:admin-id',
          'Payment declined',
          { paymentMethod: 'manual_override' }
        );
      });

      it('should throw PaymentStatusConflictException if not PENDING_PAYMENT', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAYMENT_FAILED,
        };

        mockPrismaService.order.findUnique.mockResolvedValue({
          ...mockOrder,
          status: OrderStatus.PAID,
        });

        await expect(
          service.updatePaymentStatus('order-123', dto, 'admin:admin-id')
        ).rejects.toThrow(PaymentStatusConflictException);
      });
    });

    describe('error handling', () => {
      it('should throw OrderNotFoundException when order not found', async () => {
        const dto: UpdatePaymentStatusDto = {
          status: PaymentStatusUpdate.PAID,
        };

        mockPrismaService.order.findUnique.mockResolvedValue(null);

        await expect(
          service.updatePaymentStatus('invalid-id', dto, 'admin:admin-id')
        ).rejects.toThrow(OrderNotFoundException);
      });
    });
  });

  describe('canUpdatePaymentStatus', () => {
    it('should return true when status is PENDING_PAYMENT', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        status: OrderStatus.PENDING_PAYMENT,
      });

      const result = await service.canUpdatePaymentStatus('order-123');

      expect(result).toBe(true);
    });

    it('should return false when status is not PENDING_PAYMENT', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        status: OrderStatus.PAID,
      });

      const result = await service.canUpdatePaymentStatus('order-123');

      expect(result).toBe(false);
    });

    it('should return false when order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      const result = await service.canUpdatePaymentStatus('invalid-id');

      expect(result).toBe(false);
    });
  });
});
