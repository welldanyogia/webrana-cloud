import { PrismaClient, PlanDuration, DiscountType, ImageCategory } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface CreateTestPlanOptions {
  id?: string;
  name?: string;
  displayName?: string;
  description?: string;
  cpu?: number;
  memoryMb?: number;
  diskGb?: number;
  bandwidthTb?: number;
  provider?: string;
  providerSizeSlug?: string;
  isActive?: boolean;
  sortOrder?: number;
  tags?: string[];
}

export async function createTestPlan(
  prisma: PrismaClient,
  options: CreateTestPlanOptions = {}
) {
  const id = options.id || uuidv4();
  return prisma.vpsPlan.create({
    data: {
      id,
      name: options.name || `test-plan-${id.substring(0, 8)}`,
      displayName: options.displayName || 'Test Plan',
      description: options.description || 'A test plan',
      cpu: options.cpu ?? 1,
      memoryMb: options.memoryMb ?? 1024,
      diskGb: options.diskGb ?? 25,
      bandwidthTb: options.bandwidthTb ?? 1,
      provider: options.provider || 'digitalocean',
      providerSizeSlug: options.providerSizeSlug || 's-1vcpu-1gb',
      isActive: options.isActive ?? true,
      sortOrder: options.sortOrder ?? 0,
      tags: options.tags ?? [],
    },
  });
}

export interface CreateTestPricingOptions {
  planId: string;
  duration?: PlanDuration;
  price?: number;
  cost?: number;
  isActive?: boolean;
}

export async function createTestPricing(
  prisma: PrismaClient,
  options: CreateTestPricingOptions
) {
  return prisma.planPricing.create({
    data: {
      planId: options.planId,
      duration: options.duration ?? PlanDuration.MONTHLY,
      price: options.price ?? 100000,
      cost: options.cost ?? 60000,
      isActive: options.isActive ?? true,
    },
  });
}

export interface CreateTestPromoOptions {
  planId: string;
  name?: string;
  discountType?: DiscountType;
  discountValue?: number;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export async function createTestPromo(
  prisma: PrismaClient,
  options: CreateTestPromoOptions
) {
  const now = new Date();
  return prisma.planPromo.create({
    data: {
      planId: options.planId,
      name: options.name || 'Test Promo',
      discountType: options.discountType ?? DiscountType.PERCENT,
      discountValue: options.discountValue ?? 10,
      startDate: options.startDate ?? new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endDate: options.endDate ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isActive: options.isActive ?? true,
    },
  });
}

export interface CreateTestImageOptions {
  id?: string;
  provider?: string;
  providerSlug?: string;
  displayName?: string;
  description?: string;
  category?: ImageCategory;
  version?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export async function createTestImage(
  prisma: PrismaClient,
  options: CreateTestImageOptions = {}
) {
  const id = options.id || uuidv4();
  return prisma.vpsImage.create({
    data: {
      id,
      provider: options.provider || 'digitalocean',
      providerSlug: options.providerSlug || `test-image-${id.substring(0, 8)}`,
      displayName: options.displayName || 'Test Image',
      description: options.description || 'A test image',
      category: options.category ?? ImageCategory.OS,
      version: options.version || '1.0',
      isActive: options.isActive ?? true,
      sortOrder: options.sortOrder ?? 0,
    },
  });
}

export async function linkImageToPlan(
  prisma: PrismaClient,
  planId: string,
  imageId: string
) {
  return prisma.vpsPlanImage.create({
    data: { planId, imageId },
  });
}

export interface CreateTestCouponOptions {
  id?: string;
  code?: string;
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

export async function createTestCoupon(
  prisma: PrismaClient,
  options: CreateTestCouponOptions = {}
) {
  const id = options.id || uuidv4();
  const now = new Date();
  return prisma.coupon.create({
    data: {
      id,
      code: options.code || `TEST-${id.substring(0, 8).toUpperCase()}`,
      name: options.name || 'Test Coupon',
      description: options.description || 'A test coupon',
      discountType: options.discountType ?? DiscountType.PERCENT,
      discountValue: options.discountValue ?? 10,
      minOrderAmount: options.minOrderAmount,
      maxDiscountAmount: options.maxDiscountAmount,
      maxTotalRedemptions: options.maxTotalRedemptions,
      maxRedemptionsPerUser: options.maxRedemptionsPerUser ?? 1,
      startAt: options.startAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000),
      endAt: options.endAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isActive: options.isActive ?? true,
    },
  });
}

export async function addCouponPlanRestriction(
  prisma: PrismaClient,
  couponId: string,
  planId: string
) {
  return prisma.couponPlan.create({
    data: { couponId, planId },
  });
}

export async function addCouponUserRestriction(
  prisma: PrismaClient,
  couponId: string,
  userId: string
) {
  return prisma.couponUser.create({
    data: { couponId, userId },
  });
}

export async function createCouponRedemption(
  prisma: PrismaClient,
  couponId: string,
  userId: string,
  amount: number,
  orderId?: string
) {
  return prisma.couponRedemption.create({
    data: {
      couponId,
      userId,
      orderId: orderId || uuidv4(),
      amount,
    },
  });
}
