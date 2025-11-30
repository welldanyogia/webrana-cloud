import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsIn, Min } from 'class-validator';

/**
 * DTO for creating a deposit
 */
export class CreateDepositDto {
  @ApiProperty({ example: 100000, description: 'Deposit amount in IDR (minimum 10000)' })
  @IsNumber()
  @Min(10000)
  amount: number;

  @ApiProperty({ example: 'BRIVA', description: 'Payment channel code' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer name for payment' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Customer email' })
  @IsString()
  @IsOptional()
  customerEmail?: string;

  @ApiPropertyOptional({ example: '+6281234567890', description: 'Customer phone' })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/payment/success', description: 'Return URL after payment' })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({ example: 'WELCOME2024', description: 'Promo code for bonus' })
  @IsString()
  @IsOptional()
  promoCode?: string;
}

// Transaction type values
const TRANSACTION_TYPES = ['CREDIT', 'DEBIT'] as const;
type TransactionTypeValue = (typeof TRANSACTION_TYPES)[number];

// Reference type values
const REFERENCE_TYPES = [
  'DEPOSIT',
  'DEPOSIT_BONUS',
  'WELCOME_BONUS',
  'VPS_ORDER',
  'VPS_RENEWAL',
  'PROVISION_FAILED_REFUND',
  'ADMIN_ADJUSTMENT',
] as const;
type ReferenceTypeValue = (typeof REFERENCE_TYPES)[number];

/**
 * Query DTO for listing transactions
 */
export class ListTransactionsQueryDto {
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

  @ApiPropertyOptional({ enum: TRANSACTION_TYPES, description: 'Filter by transaction type' })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionTypeValue;

  @ApiPropertyOptional({ enum: REFERENCE_TYPES, description: 'Filter by reference type' })
  @IsOptional()
  @IsIn(REFERENCE_TYPES)
  referenceType?: ReferenceTypeValue;
}

/**
 * Query DTO for listing deposits
 */
export class ListDepositsQueryDto {
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

  @ApiPropertyOptional({ example: 'PENDING', description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * Response DTOs
 */
export interface WalletResponseDto {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransactionResponseDto {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface WalletTransactionListResponseDto {
  data: WalletTransactionResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DepositResponseDto {
  id: string;
  userId: string;
  amount: number;
  bonusAmount: number;
  totalCredit: number;
  status: string;
  paymentMethod?: string;
  paymentCode?: string;
  tripayReference?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

export interface DepositListResponseDto {
  data: DepositResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DepositInitiatedResponseDto {
  deposit: DepositResponseDto;
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
 * Internal DTOs for service operations
 * Note: These use string for referenceType to avoid Prisma import issues.
 * Services should cast to/from ReferenceType enum at runtime.
 */
export interface AddBalanceParams {
  userId: string;
  amount: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface DeductBalanceParams {
  userId: string;
  amount: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
