import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ValidateCouponDto } from './dto';
import {
  CouponNotFoundException,
  CouponExpiredException,
  CouponNotStartedException,
  CouponInactiveException,
  CouponLimitGlobalReachedException,
  CouponLimitPerUserReachedException,
  CouponPlanNotAllowedException,
  CouponUserNotAllowedException,
  CouponMinAmountNotMetException,
} from '../../common/exceptions';
import { DiscountType } from '@prisma/client';

export type CouponValidationFailReason =
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'BEFORE_START'
  | 'INACTIVE'
  | 'LIMIT_GLOBAL_REACHED'
  | 'LIMIT_PER_USER_REACHED'
  | 'PLAN_NOT_ALLOWED'
  | 'USER_NOT_ALLOWED'
  | 'MIN_AMOUNT_NOT_MET';

export interface CouponValidationResult {
  valid: boolean;
  discountAmount?: number;
  finalPrice?: number;
  coupon?: {
    code: string;
    name: string;
    discountType: string;
    discountValue: number;
  };
  reason?: CouponValidationFailReason;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateCoupon(dto: ValidateCouponDto): Promise<{ data: CouponValidationResult }> {
    const { code, planId, userId, amount } = dto;
    const now = new Date();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        couponPlans: true,
        couponUsers: true,
        redemptions: true,
      },
    });

    if (!coupon) {
      return {
        data: {
          valid: false,
          reason: 'NOT_FOUND',
        },
      };
    }

    if (!coupon.isActive) {
      return {
        data: {
          valid: false,
          reason: 'INACTIVE',
        },
      };
    }

    if (now < coupon.startAt) {
      return {
        data: {
          valid: false,
          reason: 'BEFORE_START',
        },
      };
    }

    if (now > coupon.endAt) {
      return {
        data: {
          valid: false,
          reason: 'EXPIRED',
        },
      };
    }

    if (coupon.maxTotalRedemptions !== null) {
      const totalRedemptions = coupon.redemptions.length;
      if (totalRedemptions >= coupon.maxTotalRedemptions) {
        return {
          data: {
            valid: false,
            reason: 'LIMIT_GLOBAL_REACHED',
          },
        };
      }
    }

    if (userId && coupon.maxRedemptionsPerUser !== null) {
      const userRedemptions = coupon.redemptions.filter((r) => r.userId === userId).length;
      if (userRedemptions >= coupon.maxRedemptionsPerUser) {
        return {
          data: {
            valid: false,
            reason: 'LIMIT_PER_USER_REACHED',
          },
        };
      }
    }

    if (coupon.couponPlans.length > 0 && planId) {
      const isPlanAllowed = coupon.couponPlans.some((cp) => cp.planId === planId);
      if (!isPlanAllowed) {
        return {
          data: {
            valid: false,
            reason: 'PLAN_NOT_ALLOWED',
          },
        };
      }
    }

    if (coupon.couponUsers.length > 0 && userId) {
      const isUserAllowed = coupon.couponUsers.some((cu) => cu.userId === userId);
      if (!isUserAllowed) {
        return {
          data: {
            valid: false,
            reason: 'USER_NOT_ALLOWED',
          },
        };
      }
    }

    if (coupon.minOrderAmount !== null && amount < coupon.minOrderAmount) {
      return {
        data: {
          valid: false,
          reason: 'MIN_AMOUNT_NOT_MET',
        },
      };
    }

    let discountAmount = this.calculateDiscount(
      amount,
      coupon.discountType,
      coupon.discountValue
    );

    if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    const finalPrice = Math.max(0, amount - discountAmount);

    return {
      data: {
        valid: true,
        discountAmount,
        finalPrice,
        coupon: {
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
      },
    };
  }

  async validateAndThrow(dto: ValidateCouponDto): Promise<{
    discountAmount: number;
    finalPrice: number;
    couponId: string;
  }> {
    const { code, planId, userId, amount } = dto;
    const now = new Date();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        couponPlans: true,
        couponUsers: true,
        redemptions: true,
      },
    });

    if (!coupon) {
      throw new CouponNotFoundException();
    }

    if (!coupon.isActive) {
      throw new CouponInactiveException();
    }

    if (now < coupon.startAt) {
      throw new CouponNotStartedException();
    }

    if (now > coupon.endAt) {
      throw new CouponExpiredException();
    }

    if (coupon.maxTotalRedemptions !== null) {
      const totalRedemptions = coupon.redemptions.length;
      if (totalRedemptions >= coupon.maxTotalRedemptions) {
        throw new CouponLimitGlobalReachedException();
      }
    }

    if (userId && coupon.maxRedemptionsPerUser !== null) {
      const userRedemptions = coupon.redemptions.filter((r) => r.userId === userId).length;
      if (userRedemptions >= coupon.maxRedemptionsPerUser) {
        throw new CouponLimitPerUserReachedException();
      }
    }

    if (coupon.couponPlans.length > 0 && planId) {
      const isPlanAllowed = coupon.couponPlans.some((cp) => cp.planId === planId);
      if (!isPlanAllowed) {
        throw new CouponPlanNotAllowedException();
      }
    }

    if (coupon.couponUsers.length > 0 && userId) {
      const isUserAllowed = coupon.couponUsers.some((cu) => cu.userId === userId);
      if (!isUserAllowed) {
        throw new CouponUserNotAllowedException();
      }
    }

    if (coupon.minOrderAmount !== null && amount < coupon.minOrderAmount) {
      throw new CouponMinAmountNotMetException(coupon.minOrderAmount);
    }

    let discountAmount = this.calculateDiscount(
      amount,
      coupon.discountType,
      coupon.discountValue
    );

    if (coupon.maxDiscountAmount !== null && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    const finalPrice = Math.max(0, amount - discountAmount);

    return {
      discountAmount,
      finalPrice,
      couponId: coupon.id,
    };
  }

  async redeemCoupon(
    code: string,
    userId: string,
    orderId: string,
    amount: number
  ): Promise<{ data: { redemptionId: string; discountAmount: number } }> {
    const validation = await this.validateAndThrow({
      code,
      userId,
      amount,
    });

    const redemption = await this.prisma.couponRedemption.create({
      data: {
        couponId: validation.couponId,
        userId,
        orderId,
        amount: validation.discountAmount,
      },
    });

    return {
      data: {
        redemptionId: redemption.id,
        discountAmount: validation.discountAmount,
      },
    };
  }

  // ========================================
  // ADMIN CRUD Operations
  // ========================================

  async getAllCoupons() {
    const coupons = await this.prisma.coupon.findMany({
      include: {
        couponPlans: {
          include: { plan: true },
        },
        couponUsers: true,
        _count: {
          select: { redemptions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: coupons };
  }

  async getCouponById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        couponPlans: {
          include: { plan: true },
        },
        couponUsers: true,
        redemptions: true,
      },
    });

    if (!coupon) {
      throw new CouponNotFoundException();
    }

    return { data: coupon };
  }

  async createCoupon(input: {
    code: string;
    name: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    maxTotalRedemptions?: number;
    maxRedemptionsPerUser?: number;
    startAt: Date;
    endAt: Date;
    isActive?: boolean;
    planIds?: string[];
    userIds?: string[];
  }) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase() },
    });

    if (existing) {
      throw new CouponNotFoundException(); // Should be DuplicateEntryException
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minOrderAmount: input.minOrderAmount,
        maxDiscountAmount: input.maxDiscountAmount,
        maxTotalRedemptions: input.maxTotalRedemptions,
        maxRedemptionsPerUser: input.maxRedemptionsPerUser ?? 1,
        startAt: input.startAt,
        endAt: input.endAt,
        isActive: input.isActive ?? true,
        couponPlans: input.planIds
          ? { create: input.planIds.map((planId) => ({ planId })) }
          : undefined,
        couponUsers: input.userIds
          ? { create: input.userIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        couponPlans: true,
        couponUsers: true,
      },
    });

    return { data: coupon };
  }

  async updateCoupon(
    id: string,
    input: {
      name?: string;
      description?: string;
      discountType?: DiscountType;
      discountValue?: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      maxTotalRedemptions?: number;
      maxRedemptionsPerUser?: number;
      startAt?: Date;
      endAt?: Date;
      isActive?: boolean;
    }
  ) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new CouponNotFoundException();
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: input,
      include: {
        couponPlans: true,
        couponUsers: true,
      },
    });

    return { data: coupon };
  }

  async deleteCoupon(id: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new CouponNotFoundException();
    }

    await this.prisma.coupon.delete({ where: { id } });

    return { data: { message: 'Coupon berhasil dihapus' } };
  }

  async addCouponPlan(couponId: string, planId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new CouponNotFoundException();
    }

    const mapping = await this.prisma.couponPlan.create({
      data: { couponId, planId },
      include: { plan: true },
    });

    return { data: mapping };
  }

  async removeCouponPlan(couponId: string, planId: string) {
    await this.prisma.couponPlan.delete({
      where: { couponId_planId: { couponId, planId } },
    });

    return { data: { message: 'Coupon-Plan mapping berhasil dihapus' } };
  }

  async addCouponUser(couponId: string, userId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new CouponNotFoundException();
    }

    const mapping = await this.prisma.couponUser.create({
      data: { couponId, userId },
    });

    return { data: mapping };
  }

  async removeCouponUser(couponId: string, userId: string) {
    await this.prisma.couponUser.delete({
      where: { couponId_userId: { couponId, userId } },
    });

    return { data: { message: 'Coupon-User mapping berhasil dihapus' } };
  }

  async getCouponRedemptions(couponId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) {
      throw new CouponNotFoundException();
    }

    const redemptions = await this.prisma.couponRedemption.findMany({
      where: { couponId },
      orderBy: { redeemedAt: 'desc' },
    });

    return { data: redemptions };
  }

  private calculateDiscount(
    amount: number,
    discountType: DiscountType,
    discountValue: number
  ): number {
    if (discountType === DiscountType.PERCENT) {
      return Math.round(amount * (discountValue / 100));
    }
    return discountValue;
  }
}
