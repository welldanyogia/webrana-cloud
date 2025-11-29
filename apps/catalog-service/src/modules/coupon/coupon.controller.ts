import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { CouponService } from './coupon.service';
import { ValidateCouponDto } from './dto';

@Controller('catalog/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @HttpCode(200)
  async validateCoupon(@Body() dto: ValidateCouponDto) {
    return this.couponService.validateCoupon(dto);
  }
}
