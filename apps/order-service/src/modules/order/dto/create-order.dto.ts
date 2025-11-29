import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanDuration } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'UUID of the VPS plan' })
  @IsUUID('4', { message: 'planId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'planId wajib diisi' })
  planId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'UUID of the OS image' })
  @IsUUID('4', { message: 'imageId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'imageId wajib diisi' })
  imageId: string;

  @ApiProperty({ enum: ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'], example: 'MONTHLY', description: 'Billing duration' })
  @IsEnum(PlanDuration, { message: 'duration harus salah satu dari: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL' })
  @IsNotEmpty({ message: 'duration wajib diisi' })
  duration: PlanDuration;

  @ApiPropertyOptional({ example: 'WELCOME20', description: 'Optional coupon code for discount' })
  @IsOptional()
  @IsString({ message: 'couponCode harus berupa string' })
  couponCode?: string;
}
