import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, IsEmail } from 'class-validator';

/**
 * DTO for creating an invoice
 */
export class CreateInvoiceDto {
  @IsString()
  orderId: string;

  @IsString()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;
}

/**
 * DTO for initiating payment
 */
export class InitiatePaymentDto {
  @IsString()
  channel: string; // Payment channel code (e.g., BRIVA, OVO, QRIS)

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}

/**
 * Query DTO for listing invoices
 */
export class ListInvoicesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

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
