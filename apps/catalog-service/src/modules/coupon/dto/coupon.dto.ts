import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';

export enum DiscountTypeDto {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export class CreateCouponDto {
  @IsString({ message: 'Code harus berupa string' })
  @IsNotEmpty({ message: 'Code wajib diisi' })
  @MaxLength(50, { message: 'Code maksimal 50 karakter' })
  code: string;

  @IsString({ message: 'Name harus berupa string' })
  @IsNotEmpty({ message: 'Name wajib diisi' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsEnum(DiscountTypeDto, { message: 'discountType harus PERCENT atau FIXED' })
  discountType: DiscountTypeDto;

  @IsNumber({}, { message: 'discountValue harus berupa angka' })
  @Min(0, { message: 'discountValue tidak boleh negatif' })
  discountValue: number;

  @IsOptional()
  @IsNumber({}, { message: 'minOrderAmount harus berupa angka' })
  @Min(0, { message: 'minOrderAmount tidak boleh negatif' })
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'maxDiscountAmount harus berupa angka' })
  @Min(0, { message: 'maxDiscountAmount tidak boleh negatif' })
  maxDiscountAmount?: number;

  @IsOptional()
  @IsInt({ message: 'maxTotalRedemptions harus berupa integer' })
  @Min(1, { message: 'maxTotalRedemptions minimal 1' })
  maxTotalRedemptions?: number;

  @IsOptional()
  @IsInt({ message: 'maxRedemptionsPerUser harus berupa integer' })
  @Min(1, { message: 'maxRedemptionsPerUser minimal 1' })
  maxRedemptionsPerUser?: number;

  @IsDateString({}, { message: 'startAt harus berupa tanggal valid' })
  startAt: string;

  @IsDateString({}, { message: 'endAt harus berupa tanggal valid' })
  endAt: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'planIds harus berupa array' })
  @IsUUID('4', { each: true, message: 'Setiap planId harus berupa UUID valid' })
  planIds?: string[];

  @IsOptional()
  @IsArray({ message: 'userIds harus berupa array' })
  @IsUUID('4', { each: true, message: 'Setiap userId harus berupa UUID valid' })
  userIds?: string[];
}

export class UpdateCouponDto {
  @IsOptional()
  @IsString({ message: 'Name harus berupa string' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsOptional()
  @IsEnum(DiscountTypeDto, { message: 'discountType harus PERCENT atau FIXED' })
  discountType?: DiscountTypeDto;

  @IsOptional()
  @IsNumber({}, { message: 'discountValue harus berupa angka' })
  @Min(0, { message: 'discountValue tidak boleh negatif' })
  discountValue?: number;

  @IsOptional()
  @IsNumber({}, { message: 'minOrderAmount harus berupa angka' })
  @Min(0, { message: 'minOrderAmount tidak boleh negatif' })
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'maxDiscountAmount harus berupa angka' })
  @Min(0, { message: 'maxDiscountAmount tidak boleh negatif' })
  maxDiscountAmount?: number;

  @IsOptional()
  @IsInt({ message: 'maxTotalRedemptions harus berupa integer' })
  @Min(1, { message: 'maxTotalRedemptions minimal 1' })
  maxTotalRedemptions?: number;

  @IsOptional()
  @IsInt({ message: 'maxRedemptionsPerUser harus berupa integer' })
  @Min(1, { message: 'maxRedemptionsPerUser minimal 1' })
  maxRedemptionsPerUser?: number;

  @IsOptional()
  @IsDateString({}, { message: 'startAt harus berupa tanggal valid' })
  startAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endAt harus berupa tanggal valid' })
  endAt?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}

export class AddCouponPlanDto {
  @IsUUID('4', { message: 'planId harus berupa UUID valid' })
  planId: string;
}

export class AddCouponUserDto {
  @IsUUID('4', { message: 'userId harus berupa UUID valid' })
  userId: string;
}
