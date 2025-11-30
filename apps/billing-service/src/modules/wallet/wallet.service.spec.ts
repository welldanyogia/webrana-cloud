import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import {
  WalletNotFoundException,
  InsufficientBalanceException,
} from '../../common/exceptions/wallet.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

import { WalletService } from './wallet.service';

// Mock enum values (to avoid Prisma client dependency at test load time)
const TransactionType = {
  CREDIT: 'CREDIT',
  DEBIT: 'DEBIT',
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

describe('WalletService', () => {
  let service: WalletService;
  let prismaService: PrismaService;

  const mockUserId = 'user-uuid-1';
  const mockWalletId = 'wallet-uuid-1';

  const mockWallet = {
    id: mockWalletId,
    userId: mockUserId,
    balance: 100000,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransaction = {
    id: 'transaction-uuid-1',
    walletId: mockWalletId,
    type: TransactionType.CREDIT,
    amount: 50000,
    balanceBefore: 100000,
    balanceAfter: 150000,
    referenceType: ReferenceType.DEPOSIT,
    referenceId: 'deposit-uuid-1',
    description: 'Test deposit',
    metadata: null,
    createdAt: new Date(),
  };

  const mockPrismaService = {
    userWallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('should return existing wallet', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);

      const result = await service.getOrCreateWallet(mockUserId);

      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.userWallet.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        create: { userId: mockUserId, balance: 0 },
        update: {},
      });
    });

    it('should create new wallet if not exists', async () => {
      const newWallet = { ...mockWallet, balance: 0 };
      mockPrismaService.userWallet.upsert.mockResolvedValue(newWallet);

      const result = await service.getOrCreateWallet(mockUserId);

      expect(result.balance).toBe(0);
    });
  });

  describe('getBalance', () => {
    it('should return current balance', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);

      const result = await service.getBalance(mockUserId);

      expect(result).toBe(100000);
    });
  });

  describe('hasSufficientBalance', () => {
    it('should return true if balance is sufficient', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);

      const result = await service.hasSufficientBalance(mockUserId, 50000);

      expect(result).toBe(true);
    });

    it('should return false if balance is insufficient', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);

      const result = await service.hasSufficientBalance(mockUserId, 200000);

      expect(result).toBe(false);
    });
  });

  describe('addBalance', () => {
    it('should add balance successfully', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
            update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 150000 }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        };
        return callback(mockTx);
      });

      const result = await service.addBalance({
        userId: mockUserId,
        amount: 50000,
        referenceType: ReferenceType.DEPOSIT,
        referenceId: 'deposit-uuid-1',
        description: 'Test deposit',
      });

      expect(result).toEqual(mockTransaction);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should create wallet if not exists during addBalance', async () => {
      const newWallet = { ...mockWallet, balance: 0 };
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(newWallet),
            update: jest.fn().mockResolvedValue({ ...newWallet, balance: 50000 }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue({
              ...mockTransaction,
              balanceBefore: 0,
              balanceAfter: 50000,
            }),
          },
        };
        return callback(mockTx);
      });

      const result = await service.addBalance({
        userId: mockUserId,
        amount: 50000,
        referenceType: ReferenceType.DEPOSIT,
      });

      expect(result.balanceAfter).toBe(50000);
    });

    it('should throw error for non-positive amount', async () => {
      await expect(
        service.addBalance({
          userId: mockUserId,
          amount: -100,
          referenceType: ReferenceType.DEPOSIT,
        })
      ).rejects.toThrow('Amount must be positive');

      await expect(
        service.addBalance({
          userId: mockUserId,
          amount: 0,
          referenceType: ReferenceType.DEPOSIT,
        })
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('deductBalance', () => {
    it('should deduct balance successfully', async () => {
      const debitTransaction = {
        ...mockTransaction,
        type: TransactionType.DEBIT,
        amount: -50000,
        balanceBefore: 100000,
        balanceAfter: 50000,
        referenceType: ReferenceType.VPS_ORDER,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
            update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 50000 }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue(debitTransaction),
          },
        };
        return callback(mockTx);
      });

      const result = await service.deductBalance({
        userId: mockUserId,
        amount: 50000,
        referenceType: ReferenceType.VPS_ORDER,
        referenceId: 'order-uuid-1',
        description: 'VPS Order',
      });

      expect(result).toEqual(debitTransaction);
      expect(result.type).toBe(TransactionType.DEBIT);
      expect(result.amount).toBe(-50000);
    });

    it('should throw WalletNotFoundException if wallet not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      await expect(
        service.deductBalance({
          userId: mockUserId,
          amount: 50000,
          referenceType: ReferenceType.VPS_ORDER,
        })
      ).rejects.toThrow(WalletNotFoundException);
    });

    it('should throw InsufficientBalanceException if balance is insufficient', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
          },
        };
        return callback(mockTx);
      });

      await expect(
        service.deductBalance({
          userId: mockUserId,
          amount: 200000, // More than balance
          referenceType: ReferenceType.VPS_ORDER,
        })
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('should throw error for non-positive amount', async () => {
      await expect(
        service.deductBalance({
          userId: mockUserId,
          amount: -100,
          referenceType: ReferenceType.VPS_ORDER,
        })
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('getTransactions', () => {
    it('should return paginated transactions', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaService.walletTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactions(mockUserId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by transaction type', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaService.walletTransaction.count.mockResolvedValue(1);

      await service.getTransactions(mockUserId, {
        page: 1,
        limit: 10,
        type: TransactionType.CREDIT,
      });

      expect(mockPrismaService.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: TransactionType.CREDIT,
          }),
        })
      );
    });

    it('should filter by reference type', async () => {
      mockPrismaService.userWallet.upsert.mockResolvedValue(mockWallet);
      mockPrismaService.walletTransaction.findMany.mockResolvedValue([mockTransaction]);
      mockPrismaService.walletTransaction.count.mockResolvedValue(1);

      await service.getTransactions(mockUserId, {
        page: 1,
        limit: 10,
        referenceType: ReferenceType.DEPOSIT,
      });

      expect(mockPrismaService.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            referenceType: ReferenceType.DEPOSIT,
          }),
        })
      );
    });
  });

  describe('refundBalance', () => {
    it('should refund a previous deduction', async () => {
      const originalDebitTransaction = {
        ...mockTransaction,
        type: TransactionType.DEBIT,
        amount: -50000,
        walletId: mockWalletId,
        referenceId: 'order-uuid-1',
      };

      const refundTransaction = {
        ...mockTransaction,
        type: TransactionType.CREDIT,
        amount: 50000,
        referenceType: ReferenceType.PROVISION_FAILED_REFUND,
      };

      mockPrismaService.userWallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
            update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 150000 }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue(refundTransaction),
          },
        };
        return callback(mockTx);
      });

      const result = await service.refundBalance(
        originalDebitTransaction,
        'Provisioning failed'
      );

      expect(result.referenceType).toBe(ReferenceType.PROVISION_FAILED_REFUND);
    });
  });

  describe('race condition scenarios', () => {
    it('should handle concurrent balance deductions safely with serializable isolation', async () => {
      // This test verifies that the transaction uses Serializable isolation level
      const transactionSpy = jest.spyOn(prismaService, '$transaction');

      mockPrismaService.$transaction.mockImplementation(async (callback, options) => {
        // Verify isolation level is set to Serializable
        expect(options?.isolationLevel).toBe(Prisma.TransactionIsolationLevel.Serializable);
        
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
            update: jest.fn().mockResolvedValue({ ...mockWallet, balance: 50000 }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue({
              ...mockTransaction,
              type: TransactionType.DEBIT,
              amount: -50000,
            }),
          },
        };
        return callback(mockTx);
      });

      await service.deductBalance({
        userId: mockUserId,
        amount: 50000,
        referenceType: ReferenceType.VPS_ORDER,
      });

      expect(transactionSpy).toHaveBeenCalled();
    });

    it('should use version increment for optimistic locking', async () => {
      let updateCalls: any[] = [];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          userWallet: {
            findUnique: jest.fn().mockResolvedValue(mockWallet),
            update: jest.fn().mockImplementation((args) => {
              updateCalls.push(args);
              return { ...mockWallet, balance: 150000, version: 2 };
            }),
          },
          walletTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        };
        return callback(mockTx);
      });

      await service.addBalance({
        userId: mockUserId,
        amount: 50000,
        referenceType: ReferenceType.DEPOSIT,
      });

      // Verify that version is incremented
      expect(updateCalls[0].data.version).toEqual({ increment: 1 });
    });
  });
});
