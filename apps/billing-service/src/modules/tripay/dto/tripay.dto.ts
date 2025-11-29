import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEmail } from 'class-validator';

/**
 * DTO for creating a Tripay transaction
 */
export class CreateTripayTransactionDto {
  @IsString()
  method: string; // Payment channel code (e.g., BRIVA, BCAVA, OVO)

  @IsString()
  merchantRef: string; // Unique merchant reference (invoice number)

  @IsNumber()
  amount: number; // Transaction amount in IDR

  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  @IsOptional()
  customerPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TripayOrderItemDto)
  orderItems: TripayOrderItemDto[];

  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsNumber()
  @IsOptional()
  expiredTime?: number; // Unix timestamp
}

export class TripayOrderItemDto {
  @IsString()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  productUrl?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

/**
 * Response DTOs
 */
export interface TripayPaymentChannel {
  group: string;
  code: string;
  name: string;
  type: string;
  fee_merchant: {
    flat: number;
    percent: number;
  };
  fee_customer: {
    flat: number;
    percent: number;
  };
  total_fee: {
    flat: number;
    percent: number;
  };
  minimum_fee: number;
  maximum_fee: number;
  icon_url: string;
  active: boolean;
}

export interface TripayTransaction {
  reference: string;
  merchant_ref: string;
  payment_selection_type: string;
  payment_method: string;
  payment_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  callback_url: string;
  return_url: string;
  amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  pay_code: string;
  pay_url: string;
  checkout_url: string;
  status: string;
  expired_time: number;
  order_items: TripayOrderItemDto[];
  instructions: TripayInstruction[];
  qr_string?: string;
  qr_url?: string;
}

export interface TripayInstruction {
  title: string;
  steps: string[];
}

export interface TripayApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Callback DTO from Tripay webhook
 */
export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_method_code: string;
  total_amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  is_closed_payment: number;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND';
  paid_at?: number; // Unix timestamp
  note?: string;
}
