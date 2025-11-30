import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ReferenceType, TransactionType, UserWallet, WalletTransaction } from '@prisma/client';

import {
  WalletNotFoundException,
  InsufficientBalanceException,
} from '../../common/exceptions/wallet.exceptions';
import { PrismaService } from '../../prisma/prisma.service';

import {
  ListTransactionsQueryDto,
  WalletResponseDto,
  WalletTransactionListResponseDto,
  WalletTransactionResponseDto,
} from './dto/wallet.dto';

/**
 * Parameters for adding balance to wallet
 */
export interface AddBalanceParams {
  userId: string;
  amount: number;
  referenceType: ReferenceType;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for deducting balance from wallet
 */
export interface DeductBalanceParams {
  userId: string;
  amount: number;
  referenceType: ReferenceType;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Map UserWallet to response DTO
   */
  private toWalletResponseDto(wallet: UserWallet): WalletResponseDto {
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * Map WalletTransaction to response DTO
   */
  private toTransactionResponseDto(transaction: WalletTransaction): WalletTransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      balanceBefore: transaction.balanceBefore,
      balanceAfter: transaction.balanceAfter,
      referenceType: transaction.referenceType,
      referenceId: transaction.referenceId ?? undefined,
      description: transaction.description ?? undefined,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  /**
   * Get or create wallet for user
   * Uses upsert to handle race conditions on wallet creation
   */
  async getOrCreateWallet(userId: string): Promise<UserWallet> {
    this.logger.debug(`Getting or creating wallet for user: ${userId}`);

    return this.prisma.userWallet.upsert({
      where: { userId },
      create: { userId, balance: 0 },
      update: {},
    });
  }

  /**
   * Get wallet by userId
   */
  async getWallet(userId: string): Promise<WalletResponseDto> {
    const wallet = await this.getOrCreateWallet(userId);
    return this.toWalletResponseDto(wallet);
  }

  /**
   * Get balance for user
   */
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance;
  }

  /**
   * Check if user has sufficient balance (read-only, for UI)
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Add balance to user's wallet (TRANSACTION SAFE)
   * Uses Serializable isolation level to prevent race conditions
   */
  async addBalance(params: AddBalanceParams): Promise<WalletTransaction> {
    const { userId, amount, referenceType, referenceId, description, metadata } = params;

    this.logger.log(`Adding ${amount} to wallet for user ${userId}, ref: ${referenceType}/${referenceId}`);

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Ensure wallet exists
        let wallet = await tx.userWallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          // Create wallet if not exists
          wallet = await tx.userWallet.create({
            data: { userId, balance: 0 },
          });
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + amount;

        // Update balance atomically with version increment
        await tx.userWallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            version: { increment: 1 },
          },
        });

        // Create transaction record
        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.CREDIT,
            amount,
            balanceBefore,
            balanceAfter,
            referenceType,
            referenceId,
            description,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });

        this.logger.log(
          `Added ${amount} to wallet ${wallet.id}. New balance: ${balanceAfter}`
        );

        return transaction;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 second timeout
      }
    );
  }

  /**
   * Deduct balance from user's wallet (TRANSACTION SAFE with balance check)
   * Uses Serializable isolation level to prevent race conditions
   */
  async deductBalance(params: DeductBalanceParams): Promise<WalletTransaction> {
    const { userId, amount, referenceType, referenceId, description, metadata } = params;

    this.logger.log(`Deducting ${amount} from wallet for user ${userId}, ref: ${referenceType}/${referenceId}`);

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Lock and get wallet
        const wallet = await tx.userWallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new WalletNotFoundException(userId);
        }

        if (wallet.balance < amount) {
          throw new InsufficientBalanceException(wallet.balance, amount);
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore - amount;

        // Update balance atomically with version increment
        await tx.userWallet.update({
          where: { id: wallet.id },
          data: {
            balance: balanceAfter,
            version: { increment: 1 },
          },
        });

        // Create transaction record with negative amount for debit
        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.DEBIT,
            amount: -amount, // Store as negative for debit
            balanceBefore,
            balanceAfter,
            referenceType,
            referenceId,
            description,
            metadata: metadata as Prisma.InputJsonValue,
          },
        });

        this.logger.log(
          `Deducted ${amount} from wallet ${wallet.id}. New balance: ${balanceAfter}`
        );

        return transaction;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 10000, // 10 second timeout
      }
    );
  }

  /**
   * Get transaction history for user with pagination
   */
  async getTransactions(
    userId: string,
    query: ListTransactionsQueryDto
  ): Promise<WalletTransactionListResponseDto> {
    const { page = 1, limit = 10, type, referenceType } = query;
    const skip = (page - 1) * limit;

    const wallet = await this.getOrCreateWallet(userId);

    const where: Prisma.WalletTransactionWhereInput = { walletId: wallet.id };
    
    if (type) {
      where.type = type;
    }
    if (referenceType) {
      where.referenceType = referenceType;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => this.toTransactionResponseDto(tx)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get wallet by ID (for internal use)
   */
  async getWalletById(walletId: string): Promise<UserWallet | null> {
    return this.prisma.userWallet.findUnique({
      where: { id: walletId },
    });
  }

  /**
   * Reserve balance for an operation (deduct with ability to rollback)
   * Returns the transaction that can be used for rollback if needed
   */
  async reserveBalance(params: DeductBalanceParams): Promise<WalletTransaction> {
    return this.deductBalance(params);
  }

  /**
   * Refund a previous deduction (for rollback scenarios)
   */
  async refundBalance(
    originalTransaction: WalletTransaction,
    reason: string
  ): Promise<WalletTransaction> {
    const wallet = await this.prisma.userWallet.findUnique({
      where: { id: originalTransaction.walletId },
    });

    if (!wallet) {
      throw new WalletNotFoundException(originalTransaction.walletId);
    }

    // The original amount was stored as negative for debit
    const refundAmount = Math.abs(originalTransaction.amount);

    return this.addBalance({
      userId: wallet.userId,
      amount: refundAmount,
      referenceType: ReferenceType.PROVISION_FAILED_REFUND,
      referenceId: originalTransaction.referenceId ?? undefined,
      description: `Refund: ${reason}`,
      metadata: { originalTransactionId: originalTransaction.id },
    });
  }
}
