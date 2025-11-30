import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { TripayChannelNotFoundException } from '../../common/exceptions/billing.exceptions';
import {
  DepositNotFoundException,
  DepositAccessDeniedException,
  DepositExpiredException,
  InvalidDepositAmountException,
} from '../../common/exceptions/wallet.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { TripayService } from '../tripay/tripay.service';

import { DepositService } from './deposit.service';
import { WalletService } from './wallet.service';

// Mock enum values (to avoid Prisma client dependency at test load time)
const DepositStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  EXPIRED: 'EXPIRED',
  FAILED: 'FAILED',
} as const;

const ReferenceType = {
  DEPOSIT: 'DEPOSIT',
  DEPOSIT_BONUS: 'DEPOSIT_BONUS',
  WELCOME_BONUS: 'WELCOME_BONUS',
  VPS_ORDER: 'VPS_ORDER',
  VPS_RENEWAL: 'VPS_RENEWAL',
  PROVISION_FAILED_REFUND: 'PROVISION_FAILED_REFUND',
  ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT',
} as const;

describe('DepositService', () => {
  let service: DepositService;
  let _prismaService: PrismaService;
  let _tripayService: TripayService;
  let _walletService: WalletService;

  const mockUserId = 'user-uuid-1';
  const mockDepositId = 'deposit-uuid-1';
  const mockTripayReference = 'T0001234567';

  const mockDeposit = {
    id: mockDepositId,
    userId: mockUserId,
    amount: 100000,
    bonusAmount: 0,
    totalCredit: 100000,
    status: DepositStatus.PENDING,
    paymentMethod: 'BRIVA',
    paymentCode: '8077123456789',
    tripayReference: mockTripayReference,
    processedAt: null,
    idempotencyKey: `deposit_${mockUserId}_123`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    paidAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaymentChannel = {
    group: 'Virtual Account',
    code: 'BRIVA',
    name: 'BRI Virtual Account',
    type: 'virtual_account',
    fee_merchant: { flat: 2000, percent: 0 },
    fee_customer: { flat: 0, percent: 0 },
    total_fee: { flat: 2000, percent: 0 },
    minimum_fee: 2000,
    maximum_fee: 2000,
    icon_url: 'https://tripay.co.id/images/bri.png',
    active: true,
  };

  const mockTripayTransaction = {
    reference: mockTripayReference,
    merchant_ref: `DEP-${mockDepositId.substring(0, 8).toUpperCase()}`,
    payment_selection_type: 'static',
    payment_method: 'BRIVA',
    payment_name: 'BRI Virtual Account',
    customer_name: 'Customer',
    customer_email: 'customer@webrana.cloud',
    customer_phone: '',
    callback_url: '',
    return_url: '',
    amount: 100000,
    fee_merchant: 2000,
    fee_customer: 0,
    total_fee: 2000,
    amount_received: 98000,
    pay_code: '8077123456789',
    pay_url: 'https://tripay.co.id/checkout/T0001',
    checkout_url: 'https://tripay.co.id/checkout/T0001',
    status: 'UNPAID',
    expired_time: Math.floor(Date.now() / 1000) + 86400,
    order_items: [],
    instructions: [],
  };

  const mockPrismaService = {
    deposit: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockTripayService = {
    getPaymentChannels: jest.fn(),
    createTransaction: jest.fn(),
    calculateFee: jest.fn(),
  };

  const mockWalletService = {
    addBalance: jest.fn(),
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TripayService,
          useValue: mockTripayService,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'DEPOSIT_EXPIRY_HOURS') return 24;
              if (key === 'MIN_DEPOSIT_AMOUNT') return 10000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DepositService>(DepositService);
    _prismaService = module.get<PrismaService>(PrismaService);
    _tripayService = module.get<TripayService>(TripayService);
    _walletService = module.get<WalletService>(WalletService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createDeposit', () => {
    const createDto = {
      amount: 100000,
      paymentMethod: 'BRIVA',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
    };

    beforeEach(() => {
      mockTripayService.getPaymentChannels.mockResolvedValue([mockPaymentChannel]);
      mockTripayService.createTransaction.mockResolvedValue(mockTripayTransaction);
      mockTripayService.calculateFee.mockReturnValue(2000);
    });

    it('should create deposit successfully', async () => {
      mockPrismaService.deposit.create.mockResolvedValue(mockDeposit);
      mockPrismaService.deposit.update.mockResolvedValue(mockDeposit);

      const result = await service.createDeposit(mockUserId, createDto);

      expect(result.deposit.amount).toBe(100000);
      expect(result.payment.channel).toBe('BRIVA');
      expect(result.payment.paymentCode).toBe(mockTripayTransaction.pay_code);
      expect(mockTripayService.createTransaction).toHaveBeenCalled();
    });

    it('should throw InvalidDepositAmountException for amount below minimum', async () => {
      await expect(
        service.createDeposit(mockUserId, { ...createDto, amount: 5000 })
      ).rejects.toThrow(InvalidDepositAmountException);
    });

    it('should throw TripayChannelNotFoundException for invalid payment method', async () => {
      mockPrismaService.deposit.create.mockResolvedValue(mockDeposit);
      mockPrismaService.deposit.delete.mockResolvedValue(mockDeposit);
      mockTripayService.getPaymentChannels.mockResolvedValue([mockPaymentChannel]);

      await expect(
        service.createDeposit(mockUserId, { ...createDto, paymentMethod: 'INVALID' })
      ).rejects.toThrow(TripayChannelNotFoundException);

      // Should rollback deposit creation
      expect(mockPrismaService.deposit.delete).toHaveBeenCalled();
    });

    it('should rollback deposit on Tripay error', async () => {
      mockPrismaService.deposit.create.mockResolvedValue(mockDeposit);
      mockPrismaService.deposit.delete.mockResolvedValue(mockDeposit);
      mockTripayService.createTransaction.mockRejectedValue(new Error('Tripay error'));

      await expect(
        service.createDeposit(mockUserId, createDto)
      ).rejects.toThrow('Tripay error');

      expect(mockPrismaService.deposit.delete).toHaveBeenCalled();
    });
  });

  describe('processPaidDeposit', () => {
    it('should process paid deposit successfully (idempotent first call)', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue({
        ...mockDeposit,
        processedAt: null,
      });
      mockPrismaService.deposit.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.deposit.update.mockResolvedValue({
        ...mockDeposit,
        status: DepositStatus.PAID,
        processedAt: new Date(),
      });
      mockWalletService.addBalance.mockResolvedValue({});

      const result = await service.processPaidDeposit(mockTripayReference);

      expect(result).toBe(true);
      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          amount: 100000,
          referenceType: ReferenceType.DEPOSIT,
          referenceId: mockDepositId,
        })
      );
    });

    it('should return true and skip processing if already processed (idempotent second call)', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue({
        ...mockDeposit,
        processedAt: new Date(),
        status: DepositStatus.PAID,
      });

      const result = await service.processPaidDeposit(mockTripayReference);

      expect(result).toBe(true);
      expect(mockWalletService.addBalance).not.toHaveBeenCalled();
    });

    it('should return false if deposit not found', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(null);

      const result = await service.processPaidDeposit('non-existent');

      expect(result).toBe(false);
      expect(mockWalletService.addBalance).not.toHaveBeenCalled();
    });

    it('should handle race condition when another process handles the deposit', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue({
        ...mockDeposit,
        processedAt: null,
      });
      // Another process already processed it
      mockPrismaService.deposit.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.processPaidDeposit(mockTripayReference);

      expect(result).toBe(true);
      expect(mockWalletService.addBalance).not.toHaveBeenCalled();
    });

    it('should mark deposit as failed if wallet operation fails', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue({
        ...mockDeposit,
        processedAt: null,
      });
      mockPrismaService.deposit.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.deposit.update.mockResolvedValue({
        ...mockDeposit,
        status: DepositStatus.FAILED,
      });
      mockWalletService.addBalance.mockRejectedValue(new Error('Wallet error'));

      await expect(
        service.processPaidDeposit(mockTripayReference)
      ).rejects.toThrow('Wallet error');

      // Should mark deposit as failed
      expect(mockPrismaService.deposit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: DepositStatus.FAILED },
        })
      );
    });
  });

  describe('getDepositById', () => {
    it('should return deposit by ID', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(mockDeposit);

      const result = await service.getDepositById(mockDepositId);

      expect(result.id).toBe(mockDepositId);
      expect(result.amount).toBe(100000);
    });

    it('should throw DepositNotFoundException if not found', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(null);

      await expect(
        service.getDepositById('non-existent')
      ).rejects.toThrow(DepositNotFoundException);
    });

    it('should throw DepositAccessDeniedException if userId does not match', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(mockDeposit);

      await expect(
        service.getDepositById(mockDepositId, 'different-user')
      ).rejects.toThrow(DepositAccessDeniedException);
    });

    it('should return deposit if userId matches', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(mockDeposit);

      const result = await service.getDepositById(mockDepositId, mockUserId);

      expect(result.id).toBe(mockDepositId);
    });
  });

  describe('getDepositsByUserId', () => {
    it('should return paginated deposits', async () => {
      mockPrismaService.deposit.findMany.mockResolvedValue([mockDeposit]);
      mockPrismaService.deposit.count.mockResolvedValue(1);

      const result = await service.getDepositsByUserId(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrismaService.deposit.findMany.mockResolvedValue([mockDeposit]);
      mockPrismaService.deposit.count.mockResolvedValue(1);

      await service.getDepositsByUserId(mockUserId, {
        page: 1,
        limit: 10,
        status: 'PENDING',
      });

      expect(mockPrismaService.deposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            status: 'PENDING',
          },
        })
      );
    });
  });

  describe('markExpiredDeposits', () => {
    it('should mark expired deposits', async () => {
      mockPrismaService.deposit.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markExpiredDeposits();

      expect(result).toBe(5);
      expect(mockPrismaService.deposit.updateMany).toHaveBeenCalledWith({
        where: {
          status: DepositStatus.PENDING,
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: DepositStatus.EXPIRED,
        },
      });
    });
  });

  describe('cancelDeposit', () => {
    it('should cancel pending deposit', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(mockDeposit);
      mockPrismaService.deposit.update.mockResolvedValue({
        ...mockDeposit,
        status: DepositStatus.EXPIRED,
      });

      const result = await service.cancelDeposit(mockDepositId, mockUserId);

      expect(result.status).toBe('EXPIRED');
    });

    it('should throw DepositNotFoundException if not found', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelDeposit('non-existent', mockUserId)
      ).rejects.toThrow(DepositNotFoundException);
    });

    it('should throw DepositAccessDeniedException if user does not own deposit', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue(mockDeposit);

      await expect(
        service.cancelDeposit(mockDepositId, 'different-user')
      ).rejects.toThrow(DepositAccessDeniedException);
    });

    it('should throw DepositExpiredException if deposit is not pending', async () => {
      mockPrismaService.deposit.findUnique.mockResolvedValue({
        ...mockDeposit,
        status: DepositStatus.PAID,
      });

      await expect(
        service.cancelDeposit(mockDepositId, mockUserId)
      ).rejects.toThrow(DepositExpiredException);
    });
  });

  describe('duplicate webhook calls (idempotency)', () => {
    it('should handle duplicate webhook calls gracefully', async () => {
      // First call - not yet processed
      mockPrismaService.deposit.findUnique.mockResolvedValueOnce({
        ...mockDeposit,
        processedAt: null,
      });
      mockPrismaService.deposit.updateMany.mockResolvedValueOnce({ count: 1 });
      mockPrismaService.deposit.update.mockResolvedValue({
        ...mockDeposit,
        status: DepositStatus.PAID,
        processedAt: new Date(),
      });
      mockWalletService.addBalance.mockResolvedValue({});

      const result1 = await service.processPaidDeposit(mockTripayReference);
      expect(result1).toBe(true);
      expect(mockWalletService.addBalance).toHaveBeenCalledTimes(1);

      // Reset mock call count
      mockWalletService.addBalance.mockClear();

      // Second call - already processed
      mockPrismaService.deposit.findUnique.mockResolvedValueOnce({
        ...mockDeposit,
        processedAt: new Date(),
        status: DepositStatus.PAID,
      });

      const result2 = await service.processPaidDeposit(mockTripayReference);
      expect(result2).toBe(true);
      // addBalance should NOT be called again
      expect(mockWalletService.addBalance).not.toHaveBeenCalled();
    });
  });
});
