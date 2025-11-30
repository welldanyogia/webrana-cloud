import { Controller, Get, Param, Query } from '@nestjs/common';

import { VpsImageService } from './vps-image.service';
import { VpsPlanService } from './vps-plan.service';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly vpsPlanService: VpsPlanService,
    private readonly vpsImageService: VpsImageService
  ) {}

  /**
   * Get all active plans with pricing and available billing periods
   */
  @Get('plans')
  async getPlans() {
    return this.vpsPlanService.getPlansWithPeriods();
  }

  /**
   * Get plan by ID with pricing and available billing periods
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

  @Get('images')
  async getImages(@Query('planId') planId?: string) {
    return this.vpsImageService.getActiveImages(planId);
  }

  @Get('images/:id')
  async getImageById(@Param('id') id: string) {
    return this.vpsImageService.getImageById(id);
  }
}
