import { Controller, Get, Param, Query, BadRequestException } from '@nestjs/common';

import { VpsPlanService, BillingPeriod } from './vps-plan.service';

/**
 * Internal API controller for catalog service
 * Used by other microservices (e.g., order-service)
 * 
 * Endpoints:
 * - GET /internal/catalog/plans/:id/price - Get plan price for specific period
 * - GET /internal/catalog/plans/:id - Get plan details
 */
@Controller('internal/catalog')
export class InternalCatalogController {
  constructor(private readonly vpsPlanService: VpsPlanService) {}

  /**
   * Get plan price for specific billing period (internal)
   * Used by order-service for price calculation
   */
  @Get('plans/:id/price')
  async getPlanPrice(
    @Param('id') id: string,
    @Query('period') period: string
  ) {
    // Validate period parameter
    if (!period) {
      throw new BadRequestException('Parameter period wajib diisi');
    }

    const validPeriods: BillingPeriod[] = ['DAILY', 'MONTHLY', 'YEARLY'];
    const normalizedPeriod = period.toUpperCase() as BillingPeriod;
    
    if (!validPeriods.includes(normalizedPeriod)) {
      throw new BadRequestException(
        `Billing period tidak valid. Harus salah satu dari: ${validPeriods.join(', ')}`
      );
    }

    const plan = await this.vpsPlanService.findById(id);
    const price = this.vpsPlanService.getPriceForPeriod(plan, normalizedPeriod);

    return {
      data: {
        planId: id,
        period: normalizedPeriod,
        price,
      },
    };
  }

  /**
   * Get plan details with available periods (internal)
   * Used by order-service for plan validation
   */
  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    const plan = await this.vpsPlanService.findById(id);
    const availablePeriods = this.vpsPlanService.buildAvailablePeriods(plan);

    return {
      data: {
        ...plan,
        availablePeriods,
      },
    };
  }

  /**
   * Get all active plans with available periods (internal)
   * Used by order-service for plan listing
   */
  @Get('plans')
  async getPlans() {
    return this.vpsPlanService.getPlansWithPeriods();
  }

  /**
   * Validate if billing period is available for a plan (internal)
   * Returns true if period is allowed
   */
  @Get('plans/:id/validate-period')
  async validatePeriod(
    @Param('id') id: string,
    @Query('period') period: string
  ) {
    if (!period) {
      throw new BadRequestException('Parameter period wajib diisi');
    }

    const validPeriods: BillingPeriod[] = ['DAILY', 'MONTHLY', 'YEARLY'];
    const normalizedPeriod = period.toUpperCase() as BillingPeriod;
    
    if (!validPeriods.includes(normalizedPeriod)) {
      return {
        data: {
          valid: false,
          reason: `Billing period tidak valid. Harus salah satu dari: ${validPeriods.join(', ')}`,
        },
      };
    }

    const plan = await this.vpsPlanService.findById(id);
    const availablePeriods = this.vpsPlanService.getAvailablePeriods(plan);
    const isValid = availablePeriods.includes(normalizedPeriod);

    return {
      data: {
        valid: isValid,
        planId: id,
        period: normalizedPeriod,
        availablePeriods,
        reason: isValid ? null : `Period ${normalizedPeriod} tidak tersedia untuk plan ini`,
      },
    };
  }
}
