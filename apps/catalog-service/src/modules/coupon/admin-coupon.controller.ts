import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { DiscountType } from '@prisma/client';

import { CouponService } from './coupon.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  AddCouponPlanDto,
  AddCouponUserDto,
  DiscountTypeDto,
} from './dto';

@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get()
  async getAllCoupons() {
    return this.couponService.getAllCoupons();
  }

  @Get(':id')
  async getCouponById(@Param('id') id: string) {
    return this.couponService.getCouponById(id);
  }

  @Post()
  async createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponService.createCoupon({
      ...dto,
      discountType: dto.discountType as unknown as DiscountType,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });
  }

  @Patch(':id')
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, {
      ...dto,
      discountType: dto.discountType as unknown as DiscountType,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    });
  }

  @Delete(':id')
  async deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  @Post(':couponId/plans')
  async addCouponPlan(
    @Param('couponId') couponId: string,
    @Body() dto: AddCouponPlanDto
  ) {
    return this.couponService.addCouponPlan(couponId, dto.planId);
  }

  @Delete(':couponId/plans/:planId')
  async removeCouponPlan(
    @Param('couponId') couponId: string,
    @Param('planId') planId: string
  ) {
    return this.couponService.removeCouponPlan(couponId, planId);
  }

  @Post(':couponId/users')
  async addCouponUser(
    @Param('couponId') couponId: string,
    @Body() dto: AddCouponUserDto
  ) {
    return this.couponService.addCouponUser(couponId, dto.userId);
  }

  @Delete(':couponId/users/:userId')
  async removeCouponUser(
    @Param('couponId') couponId: string,
    @Param('userId') userId: string
  ) {
    return this.couponService.removeCouponUser(couponId, userId);
  }

  @Get(':couponId/redemptions')
  async getCouponRedemptions(@Param('couponId') couponId: string) {
    return this.couponService.getCouponRedemptions(couponId);
  }
}
