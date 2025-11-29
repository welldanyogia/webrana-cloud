import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { PlanDuration } from '@prisma/client';

export class CreateOrderDto {
  @IsUUID('4', { message: 'planId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'planId wajib diisi' })
  planId: string;

  @IsUUID('4', { message: 'imageId harus berupa UUID valid' })
  @IsNotEmpty({ message: 'imageId wajib diisi' })
  imageId: string;

  @IsEnum(PlanDuration, { message: 'duration harus salah satu dari: MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL' })
  @IsNotEmpty({ message: 'duration wajib diisi' })
  duration: PlanDuration;

  @IsOptional()
  @IsString({ message: 'couponCode harus berupa string' })
  couponCode?: string;
}
