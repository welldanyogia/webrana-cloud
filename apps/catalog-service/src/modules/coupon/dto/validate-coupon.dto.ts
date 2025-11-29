import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, IsUUID } from 'class-validator';

export class ValidateCouponDto {
  @IsString({ message: 'Code harus berupa string' })
  @IsNotEmpty({ message: 'Code wajib diisi' })
  code: string;

  @IsOptional()
  @IsUUID('4', { message: 'planId harus berupa UUID valid' })
  planId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'userId harus berupa UUID valid' })
  userId?: string;

  @IsNumber({}, { message: 'Amount harus berupa angka' })
  @Min(0, { message: 'Amount tidak boleh negatif' })
  amount: number;
}
