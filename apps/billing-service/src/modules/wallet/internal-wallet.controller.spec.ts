import { Test, TestingModule } from '@nestjs/testing';
import { InternalWalletController } from './internal-wallet.controller';
import { WalletService } from './wallet.service';
import { ConfigService } from '@nestjs/config';
import { ReferenceType, TransactionType } from '@prisma/client';
import { InsufficientBalanceException, WalletNotFoundException } from '../../common/exceptions/wallet.exceptions';

describe('InternalWalletController', () => {
  let controller: InternalWalletController;
  let walletService: WalletService;

  const mockWalletService = {
    getBalance: jest.fn(),
    deductBalance: jest.fn(),
    addBalance: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalWalletController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<InternalWalletController>(InternalWalletController);
    walletService = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    const userId = 'user-123';

    it('should return user balance', async () => {
      mockWalletService.getBalance.mockResolvedValue(100000);

      const result = await controller.getBalance(userId);

      expect(result).toEqual({ data: { balance: 100000 } });
      expect(mockWalletService.getBalance).toHaveBeenCalledWith(userId);
    });

    it('should return 0 balance for new user', async () => {
      mockWalletService.getBalance.mockResolvedValue(0);

      const result = await controller.getBalance(userId);

      expect(result).toEqual({ data: { balance: 0 } });
    });
  });

  describe('deductBalance', () => {
    const userId = 'user-123';
    const dto = {
      amount: 50000,
      referenceType: 'VPS_ORDER',
      referenceId: 'order-123',
      description: 'Order VPS: Basic Plan',
    };

    it('should deduct balance successfully', async () => {
      const mockTransaction = {
        id: 'tx-123',
        walletId: 'wallet-123',
        type: TransactionType.DEBIT,
        amount: -50000,
        balanceBefore: 100000,
        balanceAfter: 50000,
        referenceType: ReferenceType.VPS_ORDER,
        referenceId: 'order-123',
        description: 'Order VPS: Basic Plan',
        createdAt: new Date(),
      };

      mockWalletService.deductBalance.mockResolvedValue(mockTransaction);

      const result = await controller.deductBalance(userId, dto);

      expect(result).toEqual({
        success: true,
        data: {
          transactionId: 'tx-123',
          newBalance: 50000,
        },
      });
      expect(mockWalletService.deductBalance).toHaveBeenCalledWith({
        userId,
        amount: 50000,
        referenceType: ReferenceType.VPS_ORDER,
        referenceId: 'order-123',
        description: 'Order VPS: Basic Plan',
      });
    });

    it('should throw InsufficientBalanceException when balance is insufficient', async () => {
      mockWalletService.deductBalance.mockRejectedValue(
        new InsufficientBalanceException(30000, 50000)
      );

      await expect(controller.deductBalance(userId, dto)).rejects.toThrow(
        InsufficientBalanceException
      );
    });

    it('should map unknown reference type to ADMIN_ADJUSTMENT', async () => {
      const dtoWithUnknownType = {
        ...dto,
        referenceType: 'UNKNOWN_TYPE',
      };

      const mockTransaction = {
        id: 'tx-124',
        balanceAfter: 50000,
      };

      mockWalletService.deductBalance.mockResolvedValue(mockTransaction);

      await controller.deductBalance(userId, dtoWithUnknownType);

      expect(mockWalletService.deductBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: ReferenceType.ADMIN_ADJUSTMENT,
        })
      );
    });
  });

  describe('creditBalance', () => {
    const userId = 'user-123';
    const dto = {
      amount: 50000,
      referenceType: 'PROVISION_FAILED_REFUND',
      referenceId: 'order-123',
      description: 'Refund for failed provisioning',
    };

    it('should credit balance successfully', async () => {
      const mockTransaction = {
        id: 'tx-125',
        walletId: 'wallet-123',
        type: TransactionType.CREDIT,
        amount: 50000,
        balanceBefore: 50000,
        balanceAfter: 100000,
        referenceType: ReferenceType.PROVISION_FAILED_REFUND,
        referenceId: 'order-123',
        description: 'Refund for failed provisioning',
        createdAt: new Date(),
      };

      mockWalletService.addBalance.mockResolvedValue(mockTransaction);

      const result = await controller.creditBalance(userId, dto);

      expect(result).toEqual({
        success: true,
        data: {
          transactionId: 'tx-125',
          newBalance: 100000,
        },
      });
      expect(mockWalletService.addBalance).toHaveBeenCalledWith({
        userId,
        amount: 50000,
        referenceType: ReferenceType.PROVISION_FAILED_REFUND,
        referenceId: 'order-123',
        description: 'Refund for failed provisioning',
      });
    });

    it('should credit VPS_RENEWAL reference type correctly', async () => {
      const dtoRenewal = {
        ...dto,
        referenceType: 'VPS_RENEWAL',
      };

      const mockTransaction = {
        id: 'tx-126',
        balanceAfter: 100000,
      };

      mockWalletService.addBalance.mockResolvedValue(mockTransaction);

      await controller.creditBalance(userId, dtoRenewal);

      expect(mockWalletService.addBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: ReferenceType.VPS_RENEWAL,
        })
      );
    });
  });
});
