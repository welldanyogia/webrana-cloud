import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ReferenceType } from '@prisma/client';

import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import { WalletService } from './wallet.service';

/**
 * DTO for deducting balance
 */
class DeductBalanceDto {
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string;
}

/**
 * DTO for crediting balance
 */
class CreditBalanceDto {
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string;
}

/**
 * Internal Wallet Controller - Service-to-Service API
 * 
 * Base path: /internal/wallet
 * Authentication: X-API-Key header required
 * 
 * Used by order-service for balance operations:
 * - Check balance before order creation
 * - Deduct balance when creating order (reserve)
 * - Refund balance when provisioning fails
 */
@Controller('internal/wallet')
@UseGuards(ApiKeyGuard)
export class InternalWalletController {
  private readonly logger = new Logger(InternalWalletController.name);

  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /internal/wallet/:userId/balance
   * Get user's current balance
   * 
   * Used by order-service to check if user has sufficient balance
   */
  @Get(':userId/balance')
  @HttpCode(HttpStatus.OK)
  async getBalance(@Param('userId') userId: string) {
    this.logger.log(`Getting balance for user: ${userId}`);
    const balance = await this.walletService.getBalance(userId);
    return { data: { balance } };
  }

  /**
   * POST /internal/wallet/:userId/deduct
   * Deduct balance from user's wallet
   * 
   * Used by order-service when creating an order (reserve balance)
   * This is called BEFORE provisioning starts.
   * If provisioning fails, refundBalance should be called.
   */
  @Post(':userId/deduct')
  @HttpCode(HttpStatus.OK)
  async deductBalance(
    @Param('userId') userId: string,
    @Body() dto: DeductBalanceDto
  ) {
    this.logger.log(
      `Deducting ${dto.amount} from user ${userId} for ${dto.referenceType}:${dto.referenceId}`
    );

    // Map string referenceType to enum
    const referenceType = this.mapReferenceType(dto.referenceType);

    const transaction = await this.walletService.deductBalance({
      userId,
      amount: dto.amount,
      referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
    });

    this.logger.log(
      `Successfully deducted ${dto.amount} from user ${userId}. Transaction ID: ${transaction.id}`
    );

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        newBalance: transaction.balanceAfter,
      },
    };
  }

  /**
   * POST /internal/wallet/:userId/credit
   * Credit balance to user's wallet (refund)
   * 
   * Used by order-service when:
   * - Provisioning fails after balance was deducted
   * - Order is canceled before provisioning completes
   */
  @Post(':userId/credit')
  @HttpCode(HttpStatus.OK)
  async creditBalance(
    @Param('userId') userId: string,
    @Body() dto: CreditBalanceDto
  ) {
    this.logger.log(
      `Crediting ${dto.amount} to user ${userId} for ${dto.referenceType}:${dto.referenceId}`
    );

    // Map string referenceType to enum
    const referenceType = this.mapReferenceType(dto.referenceType);

    const transaction = await this.walletService.addBalance({
      userId,
      amount: dto.amount,
      referenceType,
      referenceId: dto.referenceId,
      description: dto.description,
    });

    this.logger.log(
      `Successfully credited ${dto.amount} to user ${userId}. Transaction ID: ${transaction.id}`
    );

    return {
      success: true,
      data: {
        transactionId: transaction.id,
        newBalance: transaction.balanceAfter,
      },
    };
  }

  /**
   * Map string referenceType to ReferenceType enum
   * Supports common reference types used by order-service
   */
  private mapReferenceType(referenceTypeStr: string): ReferenceType {
    const mapping: Record<string, ReferenceType> = {
      'VPS_ORDER': ReferenceType.VPS_ORDER,
      'VPS_RENEWAL': ReferenceType.VPS_RENEWAL,
      'PROVISION_FAILED_REFUND': ReferenceType.PROVISION_FAILED_REFUND,
      'ADMIN_ADJUSTMENT': ReferenceType.ADMIN_ADJUSTMENT,
      'DEPOSIT': ReferenceType.DEPOSIT,
      'DEPOSIT_BONUS': ReferenceType.DEPOSIT_BONUS,
      'WELCOME_BONUS': ReferenceType.WELCOME_BONUS,
    };

    return mapping[referenceTypeStr] || ReferenceType.ADMIN_ADJUSTMENT;
  }
}
