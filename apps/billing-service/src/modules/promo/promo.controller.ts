import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  ValidatePromoDto,
  PromoValidationResponseDto,
  WelcomeBonusCheckResponseDto,
  WelcomeBonusClaimResponseDto,
} from './dto/promo.dto';
import { PromoService } from './promo.service';

/**
 * Promo Controller - User Promo Operations
 *
 * Base path: /api/v1/promo
 * Authentication: JWT Bearer token required
 */
@ApiTags('Promo')
@ApiBearerAuth()
@Controller('api/v1/promo')
@UseGuards(JwtAuthGuard)
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  /**
   * POST /api/v1/promo/validate
   * Validate promo code for deposit
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate promo code for deposit' })
  @ApiResponse({
    status: 200,
    description: 'Promo code is valid',
  })
  @ApiResponse({
    status: 400,
    description: 'Promo code is invalid, expired, or already used',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async validatePromo(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ValidatePromoDto
  ): Promise<{ data: PromoValidationResponseDto }> {
    const result = await this.promoService.validatePromoForUser(
      dto.code,
      user.userId,
      dto.depositAmount
    );
    return { data: result };
  }

  /**
   * GET /api/v1/promo/welcome-bonus
   * Check if user is eligible for welcome bonus
   */
  @Get('welcome-bonus')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check welcome bonus eligibility' })
  @ApiResponse({
    status: 200,
    description: 'Returns welcome bonus eligibility status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkWelcomeBonus(
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ data: WelcomeBonusCheckResponseDto }> {
    const result = await this.promoService.getWelcomeBonusStatus(user.userId);
    return { data: result };
  }

  /**
   * POST /api/v1/promo/welcome-bonus/claim
   * Claim welcome bonus
   */
  @Post('welcome-bonus/claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Claim welcome bonus' })
  @ApiResponse({
    status: 200,
    description: 'Welcome bonus claimed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Welcome bonus not available or already claimed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async claimWelcomeBonus(
    @CurrentUser() user: CurrentUserPayload
  ): Promise<{ data: WelcomeBonusClaimResponseDto }> {
    const result = await this.promoService.claimWelcomeBonus(user.userId);
    return { data: result };
  }
}
