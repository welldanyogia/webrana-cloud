import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating an invoice
 */
export class CreateInvoiceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Order UUID' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'User UUID' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 150000, description: 'Invoice amount in IDR' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer name' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Customer email' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}

/**
 * DTO for initiating payment
 */
export class InitiatePaymentDto {
  @ApiProperty({ example: 'BRIVA', description: 'Payment channel code (e.g., BRIVA, OVO, QRIS, BCAVA)' })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer name for payment' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Customer email for payment notification' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '+6281234567890', description: 'Customer phone number' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/payment/success', description: 'URL to redirect after payment' })
  @IsString()
  @IsOptional()
  returnUrl?: string;
}

/**
 * Query DTO for listing invoices
 */
export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by invoice status' })
  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * Response DTOs
 */
export interface InvoiceResponseDto {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string;
  paymentChannel?: string;
  paymentCode?: string;
  paymentUrl?: string;
  paymentName?: string;
  paymentFee?: number;
  tripayReference?: string;
  expiredAt: string;
  paidAt?: string;
  paidAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceListResponseDto {
  data: InvoiceResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentInitiatedResponseDto {
  invoice: InvoiceResponseDto;
  payment: {
    channel: string;
    channelName: string;
    paymentCode: string;
    paymentUrl: string;
    totalAmount: number;
    fee: number;
    expiredAt: string;
    instructions?: {
      title: string;
      steps: string[];
    }[];
  };
}

/**
 * Available payment channels response
 */
export interface PaymentChannelResponseDto {
  code: string;
  name: string;
  group: string;
  type: string;
  fee: {
    flat: number;
    percent: number;
  };
  iconUrl: string;
}
