import { Controller, Get, Param, Query } from '@nestjs/common';
import { VpsPlanService } from './vps-plan.service';
import { VpsImageService } from './vps-image.service';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly vpsPlanService: VpsPlanService,
    private readonly vpsImageService: VpsImageService
  ) {}

  @Get('plans')
  async getPlans() {
    return this.vpsPlanService.getActivePlans();
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    return this.vpsPlanService.getPlanById(id);
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
