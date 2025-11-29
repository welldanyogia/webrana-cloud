import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  MaxLength,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PlanDurationDto {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum DiscountTypeDto {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum ImageCategoryDto {
  OS = 'OS',
  APP = 'APP',
}

// ========================================
// PRICING DTOs
// ========================================

export class CreatePricingDto {
  @IsEnum(PlanDurationDto, { message: 'Duration harus MONTHLY atau YEARLY' })
  duration: PlanDurationDto;

  @IsNumber({}, { message: 'Price harus berupa angka' })
  @Min(0, { message: 'Price tidak boleh negatif' })
  price: number;

  @IsNumber({}, { message: 'Cost harus berupa angka' })
  @Min(0, { message: 'Cost tidak boleh negatif' })
  cost: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}

export class UpdatePricingDto {
  @IsOptional()
  @IsNumber({}, { message: 'Price harus berupa angka' })
  @Min(0, { message: 'Price tidak boleh negatif' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Cost harus berupa angka' })
  @Min(0, { message: 'Cost tidak boleh negatif' })
  cost?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}

// ========================================
// PROMO DTOs
// ========================================

export class CreatePromoDto {
  @IsString({ message: 'Name harus berupa string' })
  @IsNotEmpty({ message: 'Name wajib diisi' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name: string;

  @IsEnum(DiscountTypeDto, { message: 'discountType harus PERCENT atau FIXED' })
  discountType: DiscountTypeDto;

  @IsNumber({}, { message: 'discountValue harus berupa angka' })
  @Min(0, { message: 'discountValue tidak boleh negatif' })
  discountValue: number;

  @IsDateString({}, { message: 'startDate harus berupa tanggal valid' })
  startDate: string;

  @IsDateString({}, { message: 'endDate harus berupa tanggal valid' })
  endDate: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}

export class UpdatePromoDto {
  @IsOptional()
  @IsString({ message: 'Name harus berupa string' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name?: string;

  @IsOptional()
  @IsEnum(DiscountTypeDto, { message: 'discountType harus PERCENT atau FIXED' })
  discountType?: DiscountTypeDto;

  @IsOptional()
  @IsNumber({}, { message: 'discountValue harus berupa angka' })
  @Min(0, { message: 'discountValue tidak boleh negatif' })
  discountValue?: number;

  @IsOptional()
  @IsDateString({}, { message: 'startDate harus berupa tanggal valid' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate harus berupa tanggal valid' })
  endDate?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}

// ========================================
// PLAN DTOs
// ========================================

export class CreatePlanDto {
  @IsString({ message: 'Name harus berupa string' })
  @IsNotEmpty({ message: 'Name wajib diisi' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name: string;

  @IsString({ message: 'displayName harus berupa string' })
  @IsNotEmpty({ message: 'displayName wajib diisi' })
  @MaxLength(255, { message: 'displayName maksimal 255 karakter' })
  displayName: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsInt({ message: 'CPU harus berupa integer' })
  @Min(1, { message: 'CPU minimal 1' })
  cpu: number;

  @IsInt({ message: 'memoryMb harus berupa integer' })
  @Min(256, { message: 'memoryMb minimal 256' })
  memoryMb: number;

  @IsInt({ message: 'diskGb harus berupa integer' })
  @Min(10, { message: 'diskGb minimal 10' })
  diskGb: number;

  @IsNumber({}, { message: 'bandwidthTb harus berupa angka' })
  @Min(0, { message: 'bandwidthTb tidak boleh negatif' })
  bandwidthTb: number;

  @IsString({ message: 'Provider harus berupa string' })
  @IsNotEmpty({ message: 'Provider wajib diisi' })
  @MaxLength(50, { message: 'Provider maksimal 50 karakter' })
  provider: string;

  @IsString({ message: 'providerSizeSlug harus berupa string' })
  @IsNotEmpty({ message: 'providerSizeSlug wajib diisi' })
  @MaxLength(100, { message: 'providerSizeSlug maksimal 100 karakter' })
  providerSizeSlug: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: 'sortOrder harus berupa integer' })
  sortOrder?: number;

  @IsOptional()
  @IsArray({ message: 'Tags harus berupa array' })
  @IsString({ each: true, message: 'Setiap tag harus berupa string' })
  tags?: string[];

  @IsOptional()
  @IsArray({ message: 'Pricings harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => CreatePricingDto)
  pricings?: CreatePricingDto[];

  @IsOptional()
  @IsArray({ message: 'Promos harus berupa array' })
  @ValidateNested({ each: true })
  @Type(() => CreatePromoDto)
  promos?: CreatePromoDto[];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString({ message: 'Name harus berupa string' })
  @MaxLength(255, { message: 'Name maksimal 255 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'displayName harus berupa string' })
  @MaxLength(255, { message: 'displayName maksimal 255 karakter' })
  displayName?: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsOptional()
  @IsInt({ message: 'CPU harus berupa integer' })
  @Min(1, { message: 'CPU minimal 1' })
  cpu?: number;

  @IsOptional()
  @IsInt({ message: 'memoryMb harus berupa integer' })
  @Min(256, { message: 'memoryMb minimal 256' })
  memoryMb?: number;

  @IsOptional()
  @IsInt({ message: 'diskGb harus berupa integer' })
  @Min(10, { message: 'diskGb minimal 10' })
  diskGb?: number;

  @IsOptional()
  @IsNumber({}, { message: 'bandwidthTb harus berupa angka' })
  @Min(0, { message: 'bandwidthTb tidak boleh negatif' })
  bandwidthTb?: number;

  @IsOptional()
  @IsString({ message: 'Provider harus berupa string' })
  @MaxLength(50, { message: 'Provider maksimal 50 karakter' })
  provider?: string;

  @IsOptional()
  @IsString({ message: 'providerSizeSlug harus berupa string' })
  @MaxLength(100, { message: 'providerSizeSlug maksimal 100 karakter' })
  providerSizeSlug?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: 'sortOrder harus berupa integer' })
  sortOrder?: number;

  @IsOptional()
  @IsArray({ message: 'Tags harus berupa array' })
  @IsString({ each: true, message: 'Setiap tag harus berupa string' })
  tags?: string[];
}

export class AddPlanImageDto {
  @IsUUID('4', { message: 'imageId harus berupa UUID valid' })
  imageId: string;
}

// ========================================
// IMAGE DTOs
// ========================================

export class CreateImageDto {
  @IsString({ message: 'Provider harus berupa string' })
  @IsNotEmpty({ message: 'Provider wajib diisi' })
  @MaxLength(50, { message: 'Provider maksimal 50 karakter' })
  provider: string;

  @IsString({ message: 'providerSlug harus berupa string' })
  @IsNotEmpty({ message: 'providerSlug wajib diisi' })
  @MaxLength(100, { message: 'providerSlug maksimal 100 karakter' })
  providerSlug: string;

  @IsString({ message: 'displayName harus berupa string' })
  @IsNotEmpty({ message: 'displayName wajib diisi' })
  @MaxLength(255, { message: 'displayName maksimal 255 karakter' })
  displayName: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsOptional()
  @IsEnum(ImageCategoryDto, { message: 'Category harus OS atau APP' })
  category?: ImageCategoryDto;

  @IsOptional()
  @IsString({ message: 'Version harus berupa string' })
  @MaxLength(50, { message: 'Version maksimal 50 karakter' })
  version?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: 'sortOrder harus berupa integer' })
  sortOrder?: number;
}

export class UpdateImageDto {
  @IsOptional()
  @IsString({ message: 'Provider harus berupa string' })
  @MaxLength(50, { message: 'Provider maksimal 50 karakter' })
  provider?: string;

  @IsOptional()
  @IsString({ message: 'providerSlug harus berupa string' })
  @MaxLength(100, { message: 'providerSlug maksimal 100 karakter' })
  providerSlug?: string;

  @IsOptional()
  @IsString({ message: 'displayName harus berupa string' })
  @MaxLength(255, { message: 'displayName maksimal 255 karakter' })
  displayName?: string;

  @IsOptional()
  @IsString({ message: 'Description harus berupa string' })
  description?: string;

  @IsOptional()
  @IsEnum(ImageCategoryDto, { message: 'Category harus OS atau APP' })
  category?: ImageCategoryDto;

  @IsOptional()
  @IsString({ message: 'Version harus berupa string' })
  @MaxLength(50, { message: 'Version maksimal 50 karakter' })
  version?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsInt({ message: 'sortOrder harus berupa integer' })
  sortOrder?: number;
}
