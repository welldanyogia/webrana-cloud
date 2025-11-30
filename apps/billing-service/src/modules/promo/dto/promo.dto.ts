import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsBoolean,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';

// Promo type values (matching Prisma enum)
export const PROMO_TYPES = [
  'DEPOSIT_BONUS',
  'WELCOME_BONUS',
  'REFERRAL_BONUS',
  'SPECIAL_EVENT',
] as const;
export type PromoTypeValue = (typeof PROMO_TYPES)[number];

// Bonus type values (matching Prisma enum)
export const BONUS_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;
export type BonusTypeValue = (typeof BONUS_TYPES)[number];

/**
 * DTO for creating a promo
 */
export class CreatePromoDto {
  @ApiProperty({ example: 'WELCOME2024', description: 'Unique promo code' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Welcome Bonus 2024', description: 'Promo name' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: 'Get 10% bonus on your first deposit',
    description: 'Promo description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: PROMO_TYPES,
    example: 'DEPOSIT_BONUS',
    description: 'Type of promo',
  })
  @IsEnum(PROMO_TYPES)
  type: PromoTypeValue;

  @ApiProperty({
    enum: BONUS_TYPES,
    example: 'PERCENTAGE',
    description: 'Type of bonus calculation',
  })
  @IsEnum(BONUS_TYPES)
  bonusType: BonusTypeValue;

  @ApiProperty({
    example: 10,
    description: 'Bonus value (percentage or fixed amount)',
  })
  @IsInt()
  @Min(1)
  bonusValue: number;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Minimum deposit to qualify (in IDR)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDeposit?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Maximum bonus cap for percentage bonuses (in IDR)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBonus?: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Promo start date',
  })
  @IsDateString()
  startAt: string;

  @ApiProperty({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Promo end date',
  })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum total uses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTotalUses?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Maximum uses per user',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ example: true, description: 'Is promo active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a promo
 */
export class UpdatePromoDto {
  @ApiPropertyOptional({ example: 'Welcome Bonus 2024 Updated', description: 'Promo name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description', description: 'Promo description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Bonus value (percentage or fixed amount)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  bonusValue?: number;

  @ApiPropertyOptional({
    example: 100000,
    description: 'Minimum deposit to qualify (in IDR)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minDeposit?: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Maximum bonus cap for percentage bonuses (in IDR)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxBonus?: number;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.000Z',
    description: 'Promo end date',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ example: 2000, description: 'Maximum total uses' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTotalUses?: number;

  @ApiPropertyOptional({ example: 2, description: 'Maximum uses per user' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ example: false, description: 'Is promo active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for validating a promo code
 */
export class ValidatePromoDto {
  @ApiProperty({ example: 'WELCOME2024', description: 'Promo code to validate' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 100000, description: 'Deposit amount in IDR (minimum 10000)' })
  @IsInt()
  @Min(10000)
  depositAmount: number;
}

/**
 * Query DTO for listing promos
 */
export class ListPromosQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: PROMO_TYPES, description: 'Filter by promo type' })
  @IsOptional()
  @IsEnum(PROMO_TYPES)
  type?: PromoTypeValue;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Response DTOs
 */

export interface PromoSummaryDto {
  id: string;
  code: string;
  name: string;
  bonusType: string;
  bonusValue: number;
}

export interface PromoValidationResponseDto {
  valid: boolean;
  promo: PromoSummaryDto;
  bonusAmount: number;
  totalCredit: number;
}

export interface PromoResponseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  bonusType: string;
  bonusValue: number;
  minDeposit?: number;
  maxBonus?: number;
  startAt: string;
  endAt: string;
  maxTotalUses?: number;
  maxUsesPerUser: number;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoListResponseDto {
  data: PromoResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PromoStatsDto {
  id: string;
  code: string;
  name: string;
  totalRedemptions: number;
  totalBonusGiven: number;
  uniqueUsers: number;
  remainingUses: number | null;
  isActive: boolean;
  daysRemaining: number;
}

export interface WelcomeBonusCheckResponseDto {
  eligible: boolean;
  bonusAmount?: number;
  promoName?: string;
}

export interface WelcomeBonusClaimResponseDto {
  success: boolean;
  bonusAmount: number;
  message: string;
}

export interface PromoRedemptionResponseDto {
  id: string;
  promoId: string;
  userId: string;
  depositId?: string;
  bonusAmount: number;
  depositAmount?: number;
  redeemedAt: string;
}
