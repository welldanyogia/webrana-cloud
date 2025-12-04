import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PlanDuration, DiscountType, VpsPlan } from '@prisma/client';

import {
  PlanNotFoundException,
  ImageNotFoundException,
  DuplicateEntryException,
  BillingPeriodNotAllowedException,
  PriceNotSetException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';

import { UpdatePlanPricingDto, AvailablePeriodResponse } from './dto';

// BillingPeriod type for the new pricing system
export type BillingPeriod = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface PricingInput {
  duration: PlanDuration;
  price: number;
  cost: number;
  isActive?: boolean;
}

export interface PromoInput {
  name: string;
  discountType: DiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
}

export interface CreatePlanInput {
  name: string;
  displayName: string;
  description?: string;
  cpu: number;
  memoryMb: number;
  diskGb: number;
  bandwidthTb: number;
  provider: string;
  providerSizeSlug: string;
  isActive?: boolean;
  sortOrder?: number;
  tags?: string[];
  pricings?: PricingInput[];
  promos?: PromoInput[];
}

export interface UpdatePlanInput {
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

export interface PlanWithPricingAndPromo {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  cpu: number;
  memoryMb: number;
  diskGb: number;
  bandwidthTb: number;
  provider: string;
  tags: string[];
  sortOrder: number;
  pricings: {
    duration: string;
    price: number;
    priceAfterPromo: number | null;
    activePromo: {
      name: string;
      discountType: string;
      discountValue: number;
    } | null;
  }[];
}

@Injectable()
export class VpsPlanService {
  private readonly logger = new Logger(VpsPlanService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActivePlans(): Promise<{ data: PlanWithPricingAndPromo[] }> {
    const now = new Date();

    const plans = await this.prisma.vpsPlan.findMany({
      where: { isActive: true },
      include: {
        pricings: {
          where: { isActive: true },
        },
        promos: {
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      data: plans.map((plan) => this.mapPlanWithPromo(plan)),
    };
  }

  async getPlanById(id: string): Promise<{ data: PlanWithPricingAndPromo }> {
    const now = new Date();

    const plan = await this.prisma.vpsPlan.findUnique({
      where: { id, isActive: true },
      include: {
        pricings: {
          where: { isActive: true },
        },
        promos: {
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
      },
    });

    if (!plan) {
      throw new PlanNotFoundException();
    }

    return { data: this.mapPlanWithPromo(plan) };
  }

  async getAllPlans() {
    const plans = await this.prisma.vpsPlan.findMany({
      include: {
        pricings: true,
        promos: true,
        allowedImages: {
          include: { image: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return { data: plans };
  }

  async getAdminPlanById(id: string) {
    const plan = await this.prisma.vpsPlan.findUnique({
      where: { id },
      include: {
        pricings: true,
        promos: true,
        allowedImages: {
          include: { image: true },
        },
      },
    });

    if (!plan) {
      throw new PlanNotFoundException();
    }

    return { data: plan };
  }

  async createPlan(input: CreatePlanInput) {
    const plan = await this.prisma.vpsPlan.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        cpu: input.cpu,
        memoryMb: input.memoryMb,
        diskGb: input.diskGb,
        bandwidthTb: input.bandwidthTb,
        provider: input.provider,
        providerSizeSlug: input.providerSizeSlug,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
        tags: input.tags ?? [],
        pricings: input.pricings
          ? {
              create: input.pricings.map((p) => ({
                duration: p.duration,
                price: p.price,
                cost: p.cost,
                isActive: p.isActive ?? true,
              })),
            }
          : undefined,
        promos: input.promos
          ? {
              create: input.promos.map((p) => ({
                name: p.name,
                discountType: p.discountType,
                discountValue: p.discountValue,
                startDate: p.startDate,
                endDate: p.endDate,
                isActive: p.isActive ?? true,
              })),
            }
          : undefined,
      },
      include: {
        pricings: true,
        promos: true,
      },
    });

    return { data: plan };
  }

  async updatePlan(id: string, input: UpdatePlanInput) {
    const existing = await this.prisma.vpsPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new PlanNotFoundException();
    }

    const plan = await this.prisma.vpsPlan.update({
      where: { id },
      data: {
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        cpu: input.cpu,
        memoryMb: input.memoryMb,
        diskGb: input.diskGb,
        bandwidthTb: input.bandwidthTb,
        provider: input.provider,
        providerSizeSlug: input.providerSizeSlug,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        tags: input.tags,
      },
      include: {
        pricings: true,
        promos: true,
        allowedImages: {
          include: { image: true },
        },
      },
    });

    return { data: plan };
  }

  async deletePlan(id: string) {
    const existing = await this.prisma.vpsPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new PlanNotFoundException();
    }

    await this.prisma.vpsPlan.delete({ where: { id } });

    return { data: { message: 'Plan berhasil dihapus' } };
  }

  // Pricing management
  async addPricing(planId: string, input: PricingInput) {
    const plan = await this.prisma.vpsPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new PlanNotFoundException();
    }

    const existingPricing = await this.prisma.planPricing.findUnique({
      where: { planId_duration: { planId, duration: input.duration } },
    });

    if (existingPricing) {
      throw new DuplicateEntryException('Pricing untuk duration ini');
    }

    const pricing = await this.prisma.planPricing.create({
      data: {
        planId,
        duration: input.duration,
        price: input.price,
        cost: input.cost,
        isActive: input.isActive ?? true,
      },
    });

    return { data: pricing };
  }

  async updatePricing(
    planId: string,
    pricingId: string,
    input: Partial<PricingInput>
  ) {
    const pricing = await this.prisma.planPricing.findFirst({
      where: { id: pricingId, planId },
    });

    if (!pricing) {
      throw new PlanNotFoundException();
    }

    const updated = await this.prisma.planPricing.update({
      where: { id: pricingId },
      data: {
        price: input.price,
        cost: input.cost,
        isActive: input.isActive,
      },
    });

    return { data: updated };
  }

  async deletePricing(planId: string, pricingId: string) {
    const pricing = await this.prisma.planPricing.findFirst({
      where: { id: pricingId, planId },
    });

    if (!pricing) {
      throw new PlanNotFoundException();
    }

    await this.prisma.planPricing.delete({ where: { id: pricingId } });

    return { data: { message: 'Pricing berhasil dihapus' } };
  }

  // Promo management
  async addPromo(planId: string, input: PromoInput) {
    const plan = await this.prisma.vpsPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new PlanNotFoundException();
    }

    const promo = await this.prisma.planPromo.create({
      data: {
        planId,
        name: input.name,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive ?? true,
      },
    });

    return { data: promo };
  }

  async updatePromo(
    planId: string,
    promoId: string,
    input: Partial<PromoInput>
  ) {
    const promo = await this.prisma.planPromo.findFirst({
      where: { id: promoId, planId },
    });

    if (!promo) {
      throw new PlanNotFoundException();
    }

    const updated = await this.prisma.planPromo.update({
      where: { id: promoId },
      data: {
        name: input.name,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        isActive: input.isActive,
      },
    });

    return { data: updated };
  }

  async deletePromo(planId: string, promoId: string) {
    const promo = await this.prisma.planPromo.findFirst({
      where: { id: promoId, planId },
    });

    if (!promo) {
      throw new PlanNotFoundException();
    }

    await this.prisma.planPromo.delete({ where: { id: promoId } });

    return { data: { message: 'Promo berhasil dihapus' } };
  }

  // Plan-Image mapping
  async addImageToPlan(planId: string, imageId: string) {
    const plan = await this.prisma.vpsPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new PlanNotFoundException();
    }

    const image = await this.prisma.vpsImage.findUnique({ where: { id: imageId } });
    if (!image) {
      throw new ImageNotFoundException();
    }

    const existing = await this.prisma.vpsPlanImage.findUnique({
      where: { planId_imageId: { planId, imageId } },
    });

    if (existing) {
      throw new DuplicateEntryException('Image mapping');
    }

    const mapping = await this.prisma.vpsPlanImage.create({
      data: { planId, imageId },
      include: { image: true },
    });

    return { data: mapping };
  }

  async removeImageFromPlan(planId: string, imageId: string) {
    const mapping = await this.prisma.vpsPlanImage.findUnique({
      where: { planId_imageId: { planId, imageId } },
    });

    if (!mapping) {
      throw new ImageNotFoundException();
    }

    await this.prisma.vpsPlanImage.delete({
      where: { planId_imageId: { planId, imageId } },
    });

    return { data: { message: 'Image mapping berhasil dihapus' } };
  }

  private mapPlanWithPromo(plan: any): PlanWithPricingAndPromo {
    const activePromo = plan.promos.length > 0 ? plan.promos[0] : null;

    return {
      id: plan.id,
      name: plan.name,
      displayName: plan.displayName,
      description: plan.description,
      cpu: plan.cpu,
      memoryMb: plan.memoryMb,
      diskGb: plan.diskGb,
      bandwidthTb: plan.bandwidthTb,
      provider: plan.provider,
      tags: plan.tags,
      sortOrder: plan.sortOrder,
      pricings: plan.pricings.map((pricing: any) => {
        let priceAfterPromo: number | null = null;

        if (activePromo) {
          priceAfterPromo = this.calculatePriceAfterPromo(
            pricing.price,
            activePromo.discountType,
            activePromo.discountValue
          );
        }

        return {
          duration: pricing.duration,
          price: pricing.price,
          priceAfterPromo,
          activePromo: activePromo
            ? {
                name: activePromo.name,
                discountType: activePromo.discountType,
                discountValue: activePromo.discountValue,
              }
            : null,
        };
      }),
    };
  }

  private calculatePriceAfterPromo(
    price: number,
    discountType: DiscountType,
    discountValue: number
  ): number {
    if (discountType === DiscountType.PERCENT) {
      return Math.round(price * (1 - discountValue / 100));
    }
    return Math.max(0, price - discountValue);
  }

  // ========================================
  // BILLING PERIOD PRICING METHODS
  // ========================================

  /**
   * Update plan pricing and billing period availability (Admin only)
   */
  async updatePlanPricing(planId: string, dto: UpdatePlanPricingDto): Promise<{ data: VpsPlan }> {
    const plan = await this.prisma.vpsPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new PlanNotFoundException();
    }

    // Validate: if enabling a period, price must be set
    const allowDaily = dto.allowDaily ?? plan.allowDaily;
    const priceDaily = dto.priceDaily ?? plan.priceDaily;
    if (allowDaily && !priceDaily) {
      throw new BadRequestException('Harga harian harus diatur untuk mengaktifkan billing harian');
    }

    const allowYearly = dto.allowYearly ?? plan.allowYearly;
    const priceYearly = dto.priceYearly ?? plan.priceYearly;
    if (allowYearly && !priceYearly) {
      throw new BadRequestException('Harga tahunan harus diatur untuk mengaktifkan billing tahunan');
    }

    const updatedPlan = await this.prisma.vpsPlan.update({
      where: { id: planId },
      data: {
        priceHourly: dto.priceHourly,
        priceDaily: dto.priceDaily,
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        allowDaily: dto.allowDaily,
        allowMonthly: dto.allowMonthly,
        allowYearly: dto.allowYearly,
      },
    });

    return { data: updatedPlan };
  }

  /**
   * Get price for a specific billing period
   */
  getPriceForPeriod(plan: VpsPlan, period: BillingPeriod): number {
    switch (period) {
      case 'DAILY':
        if (!plan.allowDaily || !plan.priceDaily) {
          throw new BillingPeriodNotAllowedException(plan.id, period);
        }
        return plan.priceDaily;

      case 'MONTHLY':
        if (!plan.allowMonthly) {
          throw new BillingPeriodNotAllowedException(plan.id, period);
        }
        if (!plan.priceMonthly) {
          throw new PriceNotSetException(period);
        }
        return plan.priceMonthly;

      case 'YEARLY':
        if (!plan.allowYearly || !plan.priceYearly) {
          throw new BillingPeriodNotAllowedException(plan.id, period);
        }
        return plan.priceYearly;

      default:
        throw new BadRequestException(`Billing period tidak valid: ${period}`);
    }
  }

  /**
   * Get available billing periods for a plan
   */
  getAvailablePeriods(plan: VpsPlan): BillingPeriod[] {
    const periods: BillingPeriod[] = [];

    if (plan.allowDaily && plan.priceDaily) {
      periods.push('DAILY');
    }
    if (plan.allowMonthly && plan.priceMonthly) {
      periods.push('MONTHLY');
    }
    if (plan.allowYearly && plan.priceYearly) {
      periods.push('YEARLY');
    }

    return periods;
  }

  /**
   * Build available periods with pricing info for API response
   */
  buildAvailablePeriods(plan: VpsPlan): AvailablePeriodResponse[] {
    const periods: AvailablePeriodResponse[] = [];

    if (plan.allowDaily && plan.priceDaily) {
      periods.push({
        period: 'DAILY',
        price: plan.priceDaily,
        pricePerMonth: plan.priceDaily * 30, // Approximate
      });
    }

    if (plan.allowMonthly && plan.priceMonthly) {
      periods.push({
        period: 'MONTHLY',
        price: plan.priceMonthly,
        pricePerMonth: plan.priceMonthly,
      });
    }

    if (plan.allowYearly && plan.priceYearly) {
      periods.push({
        period: 'YEARLY',
        price: plan.priceYearly,
        pricePerMonth: Math.round(plan.priceYearly / 12),
      });
    }

    return periods;
  }

  /**
   * Find plan by ID (for internal use)
   */
  async findById(id: string): Promise<VpsPlan> {
    const plan = await this.prisma.vpsPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new PlanNotFoundException();
    }

    return plan;
  }

  /**
   * Get plans with available periods for public API
   */
  async getPlansWithPeriods() {
    const plans = await this.prisma.vpsPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      data: plans.map((plan) => ({
        ...plan,
        availablePeriods: this.buildAvailablePeriods(plan),
      })),
    };
  }
}
