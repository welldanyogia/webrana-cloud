import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { VpsPlanService } from './vps-plan.service';
import { VpsImageService } from './vps-image.service';
import {
  CreatePlanDto,
  UpdatePlanDto,
  CreatePricingDto,
  UpdatePricingDto,
  CreatePromoDto,
  UpdatePromoDto,
  AddPlanImageDto,
  CreateImageDto,
  UpdateImageDto,
  PlanDurationDto,
  DiscountTypeDto,
  ImageCategoryDto,
} from './dto';
import { PlanDuration, DiscountType, ImageCategory } from '@prisma/client';

@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(
    private readonly vpsPlanService: VpsPlanService,
    private readonly vpsImageService: VpsImageService
  ) {}

  // ========================================
  // PLAN ENDPOINTS
  // ========================================

  @Get('plans')
  async getAllPlans() {
    return this.vpsPlanService.getAllPlans();
  }

  @Get('plans/:id')
  async getPlanById(@Param('id') id: string) {
    return this.vpsPlanService.getAdminPlanById(id);
  }

  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.vpsPlanService.createPlan({
      ...dto,
      pricings: dto.pricings?.map((p) => ({
        ...p,
        duration: p.duration as unknown as PlanDuration,
      })),
      promos: dto.promos?.map((p) => ({
        ...p,
        discountType: p.discountType as unknown as DiscountType,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate),
      })),
    });
  }

  @Patch('plans/:id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.vpsPlanService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  async deletePlan(@Param('id') id: string) {
    return this.vpsPlanService.deletePlan(id);
  }

  // ========================================
  // PLAN PRICING ENDPOINTS
  // ========================================

  @Post('plans/:planId/pricings')
  async addPlanPricing(
    @Param('planId') planId: string,
    @Body() dto: CreatePricingDto
  ) {
    return this.vpsPlanService.addPricing(planId, {
      ...dto,
      duration: dto.duration as unknown as PlanDuration,
    });
  }

  @Patch('plans/:planId/pricings/:pricingId')
  async updatePlanPricing(
    @Param('planId') planId: string,
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdatePricingDto
  ) {
    return this.vpsPlanService.updatePricing(planId, pricingId, dto);
  }

  @Delete('plans/:planId/pricings/:pricingId')
  async deletePlanPricing(
    @Param('planId') planId: string,
    @Param('pricingId') pricingId: string
  ) {
    return this.vpsPlanService.deletePricing(planId, pricingId);
  }

  // ========================================
  // PLAN PROMO ENDPOINTS
  // ========================================

  @Post('plans/:planId/promos')
  async addPlanPromo(
    @Param('planId') planId: string,
    @Body() dto: CreatePromoDto
  ) {
    return this.vpsPlanService.addPromo(planId, {
      ...dto,
      discountType: dto.discountType as unknown as DiscountType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
  }

  @Patch('plans/:planId/promos/:promoId')
  async updatePlanPromo(
    @Param('planId') planId: string,
    @Param('promoId') promoId: string,
    @Body() dto: UpdatePromoDto
  ) {
    return this.vpsPlanService.updatePromo(planId, promoId, {
      ...dto,
      discountType: dto.discountType as unknown as DiscountType,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });
  }

  @Delete('plans/:planId/promos/:promoId')
  async deletePlanPromo(
    @Param('planId') planId: string,
    @Param('promoId') promoId: string
  ) {
    return this.vpsPlanService.deletePromo(planId, promoId);
  }

  // ========================================
  // PLAN-IMAGE MAPPING ENDPOINTS
  // ========================================

  @Post('plans/:planId/images')
  async addPlanImage(
    @Param('planId') planId: string,
    @Body() dto: AddPlanImageDto
  ) {
    return this.vpsPlanService.addImageToPlan(planId, dto.imageId);
  }

  @Delete('plans/:planId/images/:imageId')
  async removePlanImage(
    @Param('planId') planId: string,
    @Param('imageId') imageId: string
  ) {
    return this.vpsPlanService.removeImageFromPlan(planId, imageId);
  }

  // ========================================
  // IMAGE ENDPOINTS
  // ========================================

  @Get('images')
  async getAllImages() {
    return this.vpsImageService.getAllImages();
  }

  @Get('images/:id')
  async getImageById(@Param('id') id: string) {
    return this.vpsImageService.getImageById(id);
  }

  @Post('images')
  async createImage(@Body() dto: CreateImageDto) {
    return this.vpsImageService.createImage({
      ...dto,
      category: dto.category as unknown as ImageCategory,
    });
  }

  @Patch('images/:id')
  async updateImage(@Param('id') id: string, @Body() dto: UpdateImageDto) {
    return this.vpsImageService.updateImage(id, {
      ...dto,
      category: dto.category as unknown as ImageCategory,
    });
  }

  @Delete('images/:id')
  async deleteImage(@Param('id') id: string) {
    return this.vpsImageService.deleteImage(id);
  }
}
