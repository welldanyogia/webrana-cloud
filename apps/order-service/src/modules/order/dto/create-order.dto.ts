import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDuration, BillingPeriod } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID of the VPS plan' })
  @IsUUID('4', { message: 'planId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'planId wajib diisi' })
  planId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'UUID of the OS image' })
  @IsUUID('4', { message: 'imageId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'imageId wajib diisi' })
  imageId: string;

  @ApiPropertyOptional({ 
    enum: ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'], 
    example: 'MONTHLY', 
    description: 'Billing duration (legacy field, use billingPeriod instead)' 
  })
  @IsOptional()
  @IsEnum(PlanDuration, { message: 'duration harus salah satu dari: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL' })
  duration?: PlanDuration;

  @ApiProperty({ 
    enum: ['DAILY', 'MONTHLY', 'YEARLY'], 
    example: 'MONTHLY', 
    description: 'Billing period for the VPS order' 
  })
  @IsEnum(BillingPeriod, { message: 'billingPeriod harus salah satu dari: DAILY, MONTHLY, YEARLY' })
  @IsNotEmpty({ message: 'billingPeriod wajib diisi' })
  billingPeriod: BillingPeriod;

  @ApiPropertyOptional({ example: 'WELCOME20', description: 'Optional coupon code for discount' })
  @IsOptional()
  @IsString({ message: 'couponCode harus berupa string' })
  couponCode?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable auto-renewal for VPS', default: true })
  @IsOptional()
  @IsBoolean({ message: 'autoRenew harus berupa boolean' })
  autoRenew?: boolean = true;
}
