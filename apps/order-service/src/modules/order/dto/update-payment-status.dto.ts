import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum PaymentStatusUpdate {
  PAID = 'PAID',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ 
    enum: PaymentStatusUpdate, 
    example: 'PAID', 
    description: 'New payment status: PAID triggers provisioning, PAYMENT_FAILED records failure' 
  })
  @IsEnum(PaymentStatusUpdate, { message: 'status harus PAID atau PAYMENT_FAILED' })
  @IsNotEmpty({ message: 'status wajib diisi' })
  status: PaymentStatusUpdate;

  @ApiPropertyOptional({ 
    example: 'Payment verified via bank transfer', 
    description: 'Optional notes for status history tracking' 
  })
  @IsOptional()
  @IsString({ message: 'notes harus berupa string' })
  notes?: string;
}
