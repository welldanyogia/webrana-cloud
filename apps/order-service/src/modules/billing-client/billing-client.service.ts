import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom, catchError } from 'rxjs';

import {
  BillingServiceUnavailableException,
  InsufficientBalanceException,
} from '../../common/exceptions';

/**
 * Response interface for balance operations
 */
export interface BalanceResponse {
  balance: number;
}

/**
 * Response interface for wallet transactions
 */
export interface WalletTransactionResponse {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

/**
 * DTO for deducting balance
 */
export interface DeductBalanceDto {
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string;
}

/**
 * DTO for crediting balance (refund)
 */
export interface CreditBalanceDto {
  amount: number;
  referenceType: string;
  referenceId: string;
  description: string;
}

/**
 * BillingClientService
 * 
 * Service to communicate with billing-service for balance operations.
 * Used by order-service to:
 * - Check user balance before order creation
 * - Deduct balance when creating order (reserve)
 * - Refund balance when provisioning fails
 */
@Injectable()
export class BillingClientService {
  private readonly logger = new Logger(BillingClientService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get internal API key for service-to-service communication
   */
  private getApiKey(): string {
    return this.configService.get<string>('INTERNAL_API_KEY', '');
  }

  /**
   * Get default headers for internal API calls
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.getApiKey(),
    };
  }

  /**
   * Get user's current balance
   * 
   * @param userId - The user ID
   * @returns The user's balance in IDR
   */
  async getBalance(userId: string): Promise<number> {
    this.logger.debug(`Getting balance for user: ${userId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: BalanceResponse }>(
          `/internal/wallet/${userId}/balance`,
          { headers: this.getHeaders() }
        ).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'getBalance', { userId });
            throw error;
          })
        )
      );

      return response.data.data.balance;
    } catch (error) {
      throw this.wrapError(error, 'getBalance');
    }
  }

  /**
   * Check if user has sufficient balance for an operation
   * 
   * @param userId - The user ID
   * @param amount - The required amount in IDR
   * @returns true if balance >= amount
   */
  async checkSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Deduct balance from user's wallet (RESERVE for order)
   * 
   * This is called when creating an order to reserve the balance.
   * The balance is deducted before provisioning starts.
   * If provisioning fails, refundBalance should be called.
   * 
   * @param userId - The user ID
   * @param amount - Amount to deduct in IDR
   * @param referenceType - Type of reference (e.g., 'VPS_ORDER')
   * @param referenceId - ID of the reference (e.g., order ID)
   * @param description - Human-readable description
   */
  async deductBalance(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
  ): Promise<void> {
    this.logger.log(
      `Deducting ${amount} IDR from user ${userId} for ${referenceType}:${referenceId}`
    );

    try {
      const dto: DeductBalanceDto = {
        amount,
        referenceType,
        referenceId,
        description,
      };

      await firstValueFrom(
        this.httpService.post(
          `/internal/wallet/${userId}/deduct`,
          dto,
          { headers: this.getHeaders() }
        ).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'deductBalance', { userId, amount, referenceType });
            throw error;
          })
        )
      );

      this.logger.log(
        `Successfully deducted ${amount} IDR from user ${userId}`
      );
    } catch (error) {
      if (error instanceof InsufficientBalanceException) {
        throw error;
      }
      throw this.wrapError(error, 'deductBalance');
    }
  }

  /**
   * Refund balance to user's wallet
   * 
   * This is called when:
   * - Provisioning fails after balance was deducted
   * - Order is canceled before provisioning completes
   * 
   * @param userId - The user ID
   * @param amount - Amount to refund in IDR
   * @param referenceType - Type of reference (e.g., 'PROVISION_FAILED_REFUND')
   * @param referenceId - ID of the reference (e.g., order ID)
   * @param description - Human-readable description
   */
  async refundBalance(
    userId: string,
    amount: number,
    referenceType: string,
    referenceId: string,
    description: string,
  ): Promise<void> {
    this.logger.log(
      `Refunding ${amount} IDR to user ${userId} for ${referenceType}:${referenceId}`
    );

    try {
      const dto: CreditBalanceDto = {
        amount,
        referenceType,
        referenceId,
        description,
      };

      await firstValueFrom(
        this.httpService.post(
          `/internal/wallet/${userId}/credit`,
          dto,
          { headers: this.getHeaders() }
        ).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'refundBalance', { userId, amount, referenceType });
            throw error;
          })
        )
      );

      this.logger.log(
        `Successfully refunded ${amount} IDR to user ${userId}`
      );
    } catch (error) {
      throw this.wrapError(error, 'refundBalance');
    }
  }

  /**
   * Handle Axios errors and convert them to appropriate exceptions
   */
  private handleAxiosError(
    error: AxiosError,
    method: string,
    context: Record<string, unknown>,
  ): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;

      this.logger.warn(
        `Billing service returned ${status} for ${method}`,
        { context, data }
      );

      // Handle insufficient balance error
      if (status === 400 && data?.code === 'INSUFFICIENT_BALANCE') {
        const details = data?.details as Record<string, unknown> | undefined;
        throw new InsufficientBalanceException(
          (details?.requiredAmount as number) || (context.amount as number)
        );
      }

      if (status === 404) {
        // Wallet not found - might need to create one
        return;
      }

      if (status >= 400 && status < 500) {
        // Client error from billing service
        return;
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      this.logger.error(
        `Billing service unavailable: ${error.message}`,
        { method, context }
      );
      throw new BillingServiceUnavailableException({
        method,
        ...context,
        errorCode: error.code,
      });
    }
  }

  /**
   * Wrap unexpected errors into BillingServiceUnavailableException
   */
  private wrapError(error: unknown, method: string): never {
    if (
      error instanceof InsufficientBalanceException ||
      error instanceof BillingServiceUnavailableException
    ) {
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error(
        `Unexpected error in ${method}: ${error.message}`,
        error.stack
      );
    }

    throw new BillingServiceUnavailableException({
      method,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
