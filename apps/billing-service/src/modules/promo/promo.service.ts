import { Injectable, Logger } from '@nestjs/common';
import { BonusType, Prisma, Promo, PromoRedemption, PromoType } from '@prisma/client';

import {
  PromoNotFoundException,
  PromoInactiveException,
  PromoExpiredException,
  PromoExhaustedException,
  PromoAlreadyUsedException,
  PromoMinDepositException,
  WelcomeBonusNotAvailableException,
  PromoIdNotFoundException,
  PromoCodeAlreadyExistsException,
} from '../../common/exceptions/promo.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';

import {
  CreatePromoDto,
  UpdatePromoDto,
  ListPromosQueryDto,
  PromoResponseDto,
  PromoListResponseDto,
  PromoValidationResponseDto,
  PromoStatsDto,
  WelcomeBonusCheckResponseDto,
  WelcomeBonusClaimResponseDto,
  PromoRedemptionResponseDto,
} from './dto/promo.dto';

/**
 * Internal result for promo validation
 */
interface PromoValidationResult {
  valid: boolean;
  promo: {
    id: string;
    code: string;
    name: string;
    type: PromoType;
    bonusType: BonusType;
    bonusValue: number;
  };
  bonusAmount: number;
  totalCredit: number;
}

/**
 * Internal result for welcome bonus check
 */
interface WelcomeBonusResult {
  promoId: string;
  bonusAmount: number;
  promoName: string;
}

/**
 * Format currency helper
 */
function formatCurrency(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService
  ) {}

  /**
   * Map Promo entity to response DTO
   */
  private toPromoResponseDto(promo: Promo): PromoResponseDto {
    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      description: promo.description ?? undefined,
      type: promo.type,
      bonusType: promo.bonusType,
      bonusValue: promo.bonusValue,
      minDeposit: promo.minDeposit ?? undefined,
      maxBonus: promo.maxBonus ?? undefined,
      startAt: promo.startAt.toISOString(),
      endAt: promo.endAt.toISOString(),
      maxTotalUses: promo.maxTotalUses ?? undefined,
      maxUsesPerUser: promo.maxUsesPerUser,
      currentUses: promo.currentUses,
      isActive: promo.isActive,
      createdAt: promo.createdAt.toISOString(),
      updatedAt: promo.updatedAt.toISOString(),
    };
  }

  /**
   * Map PromoRedemption entity to response DTO
   */
  private toRedemptionResponseDto(redemption: PromoRedemption): PromoRedemptionResponseDto {
    return {
      id: redemption.id,
      promoId: redemption.promoId,
      userId: redemption.userId,
      depositId: redemption.depositId ?? undefined,
      bonusAmount: redemption.bonusAmount,
      depositAmount: redemption.depositAmount ?? undefined,
      redeemedAt: redemption.redeemedAt.toISOString(),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // User Methods
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate promo code for a deposit
   */
  async validatePromo(
    code: string,
    userId: string,
    depositAmount: number
  ): Promise<PromoValidationResult> {
    this.logger.debug(
      `Validating promo code "${code}" for user ${userId}, deposit: ${depositAmount}`
    );

    const promo = await this.prisma.promo.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        redemptions: {
          where: { userId },
        },
      },
    });

    if (!promo) {
      throw new PromoNotFoundException(code);
    }

    // Check if active
    if (!promo.isActive) {
      throw new PromoInactiveException(code);
    }

    // Check validity period
    const now = new Date();
    if (now < promo.startAt || now > promo.endAt) {
      throw new PromoExpiredException(code);
    }

    // Check max total uses
    if (promo.maxTotalUses && promo.currentUses >= promo.maxTotalUses) {
      throw new PromoExhaustedException(code);
    }

    // Check user usage limit
    if (promo.redemptions.length >= promo.maxUsesPerUser) {
      throw new PromoAlreadyUsedException(code);
    }

    // Check minimum deposit
    if (promo.minDeposit && depositAmount < promo.minDeposit) {
      throw new PromoMinDepositException(code, promo.minDeposit);
    }

    // Calculate bonus
    let bonusAmount: number;
    if (promo.bonusType === BonusType.PERCENTAGE) {
      bonusAmount = Math.floor(depositAmount * (promo.bonusValue / 100));
      if (promo.maxBonus) {
        bonusAmount = Math.min(bonusAmount, promo.maxBonus);
      }
    } else {
      bonusAmount = promo.bonusValue;
    }

    this.logger.log(
      `Promo "${code}" validated for user ${userId}. Bonus: ${bonusAmount}`
    );

    return {
      valid: true,
      promo: {
        id: promo.id,
        code: promo.code,
        name: promo.name,
        type: promo.type,
        bonusType: promo.bonusType,
        bonusValue: promo.bonusValue,
      },
      bonusAmount,
      totalCredit: depositAmount + bonusAmount,
    };
  }

  /**
   * Apply promo and record redemption (call after deposit success)
   */
  async applyPromo(
    promoId: string,
    userId: string,
    depositId: string | null,
    depositAmount: number,
    bonusAmount: number
  ): Promise<PromoRedemption> {
    this.logger.log(
      `Applying promo ${promoId} for user ${userId}. Bonus: ${bonusAmount}`
    );

    return this.prisma.$transaction(async (tx) => {
      // Increment usage count
      await tx.promo.update({
        where: { id: promoId },
        data: { currentUses: { increment: 1 } },
      });

      // Create redemption record
      return tx.promoRedemption.create({
        data: {
          promoId,
          userId,
          depositId,
          depositAmount: depositAmount || null,
          bonusAmount,
        },
      });
    });
  }

  /**
   * Check and apply welcome bonus for new user
   */
  async checkWelcomeBonus(userId: string): Promise<WelcomeBonusResult | null> {
    this.logger.debug(`Checking welcome bonus for user ${userId}`);

    // Find active welcome bonus promo
    const welcomePromo = await this.prisma.promo.findFirst({
      where: {
        type: PromoType.WELCOME_BONUS,
        isActive: true,
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
      include: {
        redemptions: {
          where: { userId },
        },
      },
    });

    if (!welcomePromo || welcomePromo.redemptions.length > 0) {
      return null; // No welcome bonus or already claimed
    }

    // Check total uses limit
    if (
      welcomePromo.maxTotalUses &&
      welcomePromo.currentUses >= welcomePromo.maxTotalUses
    ) {
      return null;
    }

    return {
      promoId: welcomePromo.id,
      bonusAmount: welcomePromo.bonusValue,
      promoName: welcomePromo.name,
    };
  }

  /**
   * Get welcome bonus eligibility status for user
   */
  async getWelcomeBonusStatus(userId: string): Promise<WelcomeBonusCheckResponseDto> {
    const welcomeBonus = await this.checkWelcomeBonus(userId);

    if (!welcomeBonus) {
      return { eligible: false };
    }

    return {
      eligible: true,
      bonusAmount: welcomeBonus.bonusAmount,
      promoName: welcomeBonus.promoName,
    };
  }

  /**
   * Claim welcome bonus
   */
  async claimWelcomeBonus(userId: string): Promise<WelcomeBonusClaimResponseDto> {
    this.logger.log(`User ${userId} claiming welcome bonus`);

    const welcomeBonus = await this.checkWelcomeBonus(userId);

    if (!welcomeBonus) {
      throw new WelcomeBonusNotAvailableException();
    }

    // Add bonus to wallet
    await this.walletService.addBalance({
      userId,
      amount: welcomeBonus.bonusAmount,
      referenceType: 'WELCOME_BONUS',
      referenceId: welcomeBonus.promoId,
      description: `Welcome Bonus: ${welcomeBonus.promoName}`,
    });

    // Record redemption
    await this.applyPromo(
      welcomeBonus.promoId,
      userId,
      null, // No deposit for welcome bonus
      0,
      welcomeBonus.bonusAmount
    );

    this.logger.log(
      `Welcome bonus claimed by user ${userId}. Amount: ${welcomeBonus.bonusAmount}`
    );

    return {
      success: true,
      bonusAmount: welcomeBonus.bonusAmount,
      message: `Selamat! Anda mendapat bonus ${formatCurrency(welcomeBonus.bonusAmount)}`,
    };
  }

  /**
   * Validate promo and return response DTO
   */
  async validatePromoForUser(
    code: string,
    userId: string,
    depositAmount: number
  ): Promise<PromoValidationResponseDto> {
    const result = await this.validatePromo(code, userId, depositAmount);
    return {
      valid: result.valid,
      promo: {
        id: result.promo.id,
        code: result.promo.code,
        name: result.promo.name,
        bonusType: result.promo.bonusType,
        bonusValue: result.promo.bonusValue,
      },
      bonusAmount: result.bonusAmount,
      totalCredit: result.totalCredit,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Admin Methods
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Create a new promo (Admin)
   */
  async createPromo(dto: CreatePromoDto): Promise<PromoResponseDto> {
    this.logger.log(`Creating promo with code: ${dto.code}`);

    // Check if code already exists
    const existing = await this.prisma.promo.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new PromoCodeAlreadyExistsException(dto.code);
    }

    const promo = await this.prisma.promo.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: dto.type as PromoType,
        bonusType: dto.bonusType as BonusType,
        bonusValue: dto.bonusValue,
        minDeposit: dto.minDeposit,
        maxBonus: dto.maxBonus,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        maxTotalUses: dto.maxTotalUses,
        maxUsesPerUser: dto.maxUsesPerUser ?? 1,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Promo created: ${promo.id} - ${promo.code}`);

    return this.toPromoResponseDto(promo);
  }

  /**
   * Update a promo (Admin)
   */
  async updatePromo(id: string, dto: UpdatePromoDto): Promise<PromoResponseDto> {
    this.logger.log(`Updating promo: ${id}`);

    // Check if promo exists
    const existing = await this.prisma.promo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PromoIdNotFoundException(id);
    }

    const promo = await this.prisma.promo.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        bonusValue: dto.bonusValue,
        minDeposit: dto.minDeposit,
        maxBonus: dto.maxBonus,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        maxTotalUses: dto.maxTotalUses,
        maxUsesPerUser: dto.maxUsesPerUser,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Promo updated: ${promo.id}`);

    return this.toPromoResponseDto(promo);
  }

  /**
   * Delete a promo (Admin)
   */
  async deletePromo(id: string): Promise<void> {
    this.logger.log(`Deleting promo: ${id}`);

    // Check if promo exists
    const existing = await this.prisma.promo.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new PromoIdNotFoundException(id);
    }

    // Soft delete by marking as inactive
    // (or hard delete if no redemptions)
    const redemptionCount = await this.prisma.promoRedemption.count({
      where: { promoId: id },
    });

    if (redemptionCount > 0) {
      // Soft delete - just mark inactive
      await this.prisma.promo.update({
        where: { id },
        data: { isActive: false },
      });
      this.logger.log(`Promo ${id} soft deleted (has ${redemptionCount} redemptions)`);
    } else {
      // Hard delete
      await this.prisma.promo.delete({
        where: { id },
      });
      this.logger.log(`Promo ${id} hard deleted`);
    }
  }

  /**
   * Get promo by ID (Admin)
   */
  async getPromoById(id: string): Promise<PromoResponseDto> {
    const promo = await this.prisma.promo.findUnique({
      where: { id },
    });

    if (!promo) {
      throw new PromoIdNotFoundException(id);
    }

    return this.toPromoResponseDto(promo);
  }

  /**
   * List promos with pagination (Admin)
   */
  async listPromos(query: ListPromosQueryDto): Promise<PromoListResponseDto> {
    const { page = 1, limit = 10, type, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PromoWhereInput = {};
    if (type) {
      where.type = type as PromoType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [promos, total] = await Promise.all([
      this.prisma.promo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.promo.count({ where }),
    ]);

    return {
      data: promos.map((promo) => this.toPromoResponseDto(promo)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get promo usage statistics (Admin)
   */
  async getPromoStats(id: string): Promise<PromoStatsDto> {
    const promo = await this.prisma.promo.findUnique({
      where: { id },
      include: {
        redemptions: true,
      },
    });

    if (!promo) {
      throw new PromoIdNotFoundException(id);
    }

    const totalBonusGiven = promo.redemptions.reduce(
      (sum, r) => sum + r.bonusAmount,
      0
    );
    const uniqueUsers = new Set(promo.redemptions.map((r) => r.userId)).size;

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((promo.endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: promo.id,
      code: promo.code,
      name: promo.name,
      totalRedemptions: promo.currentUses,
      totalBonusGiven,
      uniqueUsers,
      remainingUses: promo.maxTotalUses
        ? promo.maxTotalUses - promo.currentUses
        : null,
      isActive: promo.isActive,
      daysRemaining,
    };
  }

  /**
   * Calculate deposit bonus for integration with deposit service
   * This method is meant to be called internally by the deposit service
   */
  async calculateDepositBonus(
    userId: string,
    depositAmount: number,
    promoCode?: string
  ): Promise<{ bonusAmount: number; promoId?: string }> {
    if (!promoCode) {
      return { bonusAmount: 0 };
    }

    try {
      const validation = await this.validatePromo(promoCode, userId, depositAmount);
      return {
        bonusAmount: validation.bonusAmount,
        promoId: validation.promo.id,
      };
    } catch (error) {
      // If promo validation fails, log and return 0 bonus
      this.logger.warn(
        `Promo validation failed for code "${promoCode}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return { bonusAmount: 0 };
    }
  }
}
