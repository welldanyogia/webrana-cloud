import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Deposit, DepositStatus, Prisma, ReferenceType } from '@prisma/client';

import { TripayChannelNotFoundException } from '../../common/exceptions/billing.exceptions';
import {
  DepositNotFoundException,
  DepositAccessDeniedException,
  DepositExpiredException,
  InvalidDepositAmountException,
} from '../../common/exceptions/wallet.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { TripayService } from '../tripay/tripay.service';

import {
  CreateDepositDto,
  DepositResponseDto,
  DepositListResponseDto,
  DepositInitiatedResponseDto,
  ListDepositsQueryDto,
} from './dto/wallet.dto';
import { WalletService } from './wallet.service';

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);
  private readonly depositExpiryHours: number;
  private readonly minDepositAmount: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tripayService: TripayService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService
  ) {
    this.depositExpiryHours = this.configService.get<number>('DEPOSIT_EXPIRY_HOURS', 24);
    this.minDepositAmount = this.configService.get<number>('MIN_DEPOSIT_AMOUNT', 10000);
  }

  /**
   * Map Deposit to response DTO
   */
  private toDepositResponseDto(deposit: Deposit): DepositResponseDto {
    return {
      id: deposit.id,
      userId: deposit.userId,
      amount: deposit.amount,
      bonusAmount: deposit.bonusAmount,
      totalCredit: deposit.totalCredit,
      status: deposit.status,
      paymentMethod: deposit.paymentMethod ?? undefined,
      paymentCode: deposit.paymentCode ?? undefined,
      tripayReference: deposit.tripayReference ?? undefined,
      expiresAt: deposit.expiresAt.toISOString(),
      paidAt: deposit.paidAt?.toISOString(),
      createdAt: deposit.createdAt.toISOString(),
    };
  }

  /**
   * Get payment method type from channel code
   */
  private getPaymentMethodType(channel: { type: string }): string {
    switch (channel.type) {
      case 'virtual_account':
        return 'VIRTUAL_ACCOUNT';
      case 'ewallet':
        return 'EWALLET';
      case 'qris':
        return 'QRIS';
      case 'convenience_store':
        return 'CONVENIENCE_STORE';
      default:
        return 'VIRTUAL_ACCOUNT';
    }
  }

  /**
   * Create a new deposit (initiate payment via Tripay)
   */
  async createDeposit(
    userId: string,
    dto: CreateDepositDto
  ): Promise<DepositInitiatedResponseDto> {
    this.logger.log(`Creating deposit for user ${userId}, amount: ${dto.amount}`);

    // Validate minimum amount
    if (dto.amount < this.minDepositAmount) {
      throw new InvalidDepositAmountException(dto.amount, this.minDepositAmount);
    }

    // Generate idempotency key
    const idempotencyKey = `deposit_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.depositExpiryHours);

    // Create deposit record
    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount: dto.amount,
        bonusAmount: 0, // Will be calculated when paid
        totalCredit: dto.amount,
        status: DepositStatus.PENDING,
        idempotencyKey,
        expiresAt,
      },
    });

    // Get payment channels to validate and get channel info
    const channels = await this.tripayService.getPaymentChannels();
    const selectedChannel = channels.find((ch) => ch.code === dto.paymentMethod);

    if (!selectedChannel) {
      // Rollback deposit creation
      await this.prisma.deposit.delete({ where: { id: deposit.id } });
      throw new TripayChannelNotFoundException(dto.paymentMethod);
    }

    // Create Tripay transaction
    const expiredTime = Math.floor(expiresAt.getTime() / 1000);

    try {
      const transaction = await this.tripayService.createTransaction({
        method: dto.paymentMethod,
        merchantRef: `DEP-${deposit.id.substring(0, 8).toUpperCase()}`,
        amount: dto.amount,
        customerName: dto.customerName || 'Customer',
        customerEmail: dto.customerEmail || 'customer@webrana.cloud',
        customerPhone: dto.customerPhone,
        orderItems: [
          {
            name: `Deposit Saldo`,
            price: dto.amount,
            quantity: 1,
          },
        ],
        returnUrl: dto.returnUrl,
        expiredTime,
      });

      // Calculate fee
      const paymentFee = this.tripayService.calculateFee(selectedChannel, dto.amount);

      // Update deposit with Tripay reference
      const updatedDeposit = await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          tripayReference: transaction.reference,
          paymentCode: transaction.pay_code,
          paymentMethod: dto.paymentMethod,
        },
      });

      this.logger.log(
        `Deposit created: ${deposit.id}, Tripay ref: ${transaction.reference}`
      );

      return {
        deposit: this.toDepositResponseDto(updatedDeposit),
        payment: {
          channel: dto.paymentMethod,
          channelName: transaction.payment_name,
          paymentCode: transaction.pay_code,
          paymentUrl: transaction.checkout_url,
          totalAmount: dto.amount + paymentFee,
          fee: paymentFee,
          expiredAt: expiresAt.toISOString(),
          instructions: transaction.instructions,
        },
      };
    } catch (error) {
      // Rollback deposit creation on Tripay error
      await this.prisma.deposit.delete({ where: { id: deposit.id } });
      throw error;
    }
  }

  /**
   * Process paid deposit (called from webhook - IDEMPOTENT)
   * This method is designed to be idempotent - calling it multiple times
   * with the same tripayReference will have no additional effect
   */
  async processPaidDeposit(tripayReference: string): Promise<boolean> {
    this.logger.log(`Processing paid deposit for Tripay ref: ${tripayReference}`);

    // Find deposit by Tripay reference
    const deposit = await this.prisma.deposit.findUnique({
      where: { tripayReference },
    });

    if (!deposit) {
      this.logger.warn(`Deposit not found for Tripay ref: ${tripayReference}`);
      return false;
    }

    // Idempotency check - if already processed, return success
    if (deposit.processedAt) {
      this.logger.log(`Deposit ${deposit.id} already processed at ${deposit.processedAt}`);
      return true;
    }

    // Atomic update to mark as processing (prevents race condition)
    // Only update if processedAt is still null
    const updateResult = await this.prisma.deposit.updateMany({
      where: {
        id: deposit.id,
        processedAt: null,
      },
      data: {
        processedAt: new Date(),
        status: DepositStatus.PAID,
        paidAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      // Another process already handled this deposit
      this.logger.log(`Deposit ${deposit.id} was processed by another instance`);
      return true;
    }

    try {
      // Calculate bonus (for now, no bonus - can be extended with promo service)
      const bonus = 0; // await this.promoService.calculateDepositBonus(deposit.userId, deposit.amount);

      // Update deposit with bonus amount
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          bonusAmount: bonus,
          totalCredit: deposit.amount + bonus,
        },
      });

      // Add main deposit amount to wallet
      await this.walletService.addBalance({
        userId: deposit.userId,
        amount: deposit.amount,
        referenceType: ReferenceType.DEPOSIT,
        referenceId: deposit.id,
        description: `Deposit via ${deposit.paymentMethod}`,
        metadata: { tripayReference },
      });

      // Add bonus if any
      if (bonus > 0) {
        await this.walletService.addBalance({
          userId: deposit.userId,
          amount: bonus,
          referenceType: ReferenceType.DEPOSIT_BONUS,
          referenceId: deposit.id,
          description: `Bonus deposit ${bonus}`,
          metadata: { tripayReference },
        });
      }

      this.logger.log(
        `Deposit ${deposit.id} processed successfully. Amount: ${deposit.amount}, Bonus: ${bonus}`
      );

      // TODO: Send notification to user
      // await this.notificationService.send({
      //   userId: deposit.userId,
      //   event: 'DEPOSIT_SUCCESS',
      //   data: { amount: deposit.amount, bonus, total: deposit.amount + bonus },
      // });

      return true;
    } catch (error) {
      // If wallet operation fails, we need to rollback the processedAt
      // This is a critical error that needs manual intervention
      this.logger.error(
        `Failed to add balance for deposit ${deposit.id}: ${error}`,
        error instanceof Error ? error.stack : undefined
      );

      // Mark deposit as failed
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status: DepositStatus.FAILED,
        },
      });

      throw error;
    }
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(depositId: string, userId?: string): Promise<DepositResponseDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new DepositNotFoundException(depositId);
    }

    // Check ownership if userId provided
    if (userId && deposit.userId !== userId) {
      throw new DepositAccessDeniedException(depositId);
    }

    return this.toDepositResponseDto(deposit);
  }

  /**
   * Get deposit by Tripay reference (for webhook)
   */
  async getDepositByTripayReference(tripayReference: string): Promise<Deposit | null> {
    return this.prisma.deposit.findUnique({
      where: { tripayReference },
    });
  }

  /**
   * Get deposits by user ID with pagination
   */
  async getDepositsByUserId(
    userId: string,
    query: ListDepositsQueryDto
  ): Promise<DepositListResponseDto> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DepositWhereInput = { userId };
    if (status) {
      where.status = status as DepositStatus;
    }

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return {
      data: deposits.map((dep) => this.toDepositResponseDto(dep)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark expired deposits (called by cron job)
   */
  async markExpiredDeposits(): Promise<number> {
    const result = await this.prisma.deposit.updateMany({
      where: {
        status: DepositStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: DepositStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} deposits as expired`);
    }

    return result.count;
  }

  /**
   * Cancel a pending deposit
   */
  async cancelDeposit(depositId: string, userId: string): Promise<DepositResponseDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new DepositNotFoundException(depositId);
    }

    if (deposit.userId !== userId) {
      throw new DepositAccessDeniedException(depositId);
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw new DepositExpiredException(depositId);
    }

    const updatedDeposit = await this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: DepositStatus.EXPIRED },
    });

    return this.toDepositResponseDto(updatedDeposit);
  }
}
