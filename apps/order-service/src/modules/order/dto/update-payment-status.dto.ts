import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum PaymentStatusUpdate {
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentStatusUpdate, { message: 'status harus PAID atau PAYMENT_FAILED' })
  @IsNotEmpty({ message: 'status wajib diisi' })
  status: PaymentStatusUpdate;

  @IsOptional()
  @IsString({ message: 'notes harus berupa string' })
  notes?: string;
}
