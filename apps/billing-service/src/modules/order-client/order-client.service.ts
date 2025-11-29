import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import {
  OrderServiceUnavailableException,
  OrderNotFoundException,
} from '../../common/exceptions/billing.exceptions';

export interface UpdatePaymentStatusDto {
  status: 'PAID' | 'FAILED';
  reference?: string;
  paidAt?: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  status: string;
  finalPrice: number;
}

@Injectable()
export class OrderClientService {
  private readonly logger = new Logger(OrderClientService.name);
  private readonly apiKey: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    if (!this.apiKey) {
      this.logger.warn(
        'INTERNAL_API_KEY is not configured. Order service calls will fail.'
      );
    }
  }

  /**
   * Update payment status of an order
   * 
   * Calls POST /api/v1/internal/orders/{orderId}/payment-status
   * with X-API-Key header for authentication
   */
  async updatePaymentStatus(
    orderId: string,
    status: 'PAID' | 'FAILED',
    reference?: string
  ): Promise<OrderResponse> {
    this.logger.log(
      `Updating payment status for order ${orderId} to ${status}`
    );

    const payload: UpdatePaymentStatusDto = {
      status,
      reference,
      paidAt: status === 'PAID' ? new Date().toISOString() : undefined,
    };

    return this.executeWithRetry(orderId, async () => {
      const response = await firstValueFrom(
        this.httpService.post<{ data: OrderResponse }>(
          `/api/v1/internal/orders/${orderId}/payment-status`,
          payload,
          {
            headers: {
              'X-API-Key': this.apiKey,
            },
          }
        )
      );

      this.logger.log(
        `Successfully updated order ${orderId} payment status to ${status}`
      );

      return response.data.data;
    });
  }

  /**
   * Get order details by ID
   * 
   * Calls GET /api/v1/internal/orders/{orderId}
   */
  async getOrder(orderId: string): Promise<OrderResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: OrderResponse }>(
          `/api/v1/internal/orders/${orderId}`,
          {
            headers: {
              'X-API-Key': this.apiKey,
            },
          }
        )
      );

      return response.data.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null;
      }
      this.handleError(error, orderId);
      throw error;
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    orderId: string,
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Check if we should retry before converting to custom exception
      const shouldRetry = this.shouldRetryError(axiosError);
      
      if (shouldRetry && attempt < this.maxRetries) {
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
        this.logger.warn(
          `Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`
        );
        
        await this.sleep(delay);
        return this.executeWithRetry(orderId, fn, attempt + 1);
      }

      // Convert to custom exception and throw
      this.handleError(error, orderId);
      throw error; // This line won't be reached if handleError throws
    }
  }

  /**
   * Determine if we should retry based on the error
   */
  private shouldRetryError(error: AxiosError): boolean {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.response?.status) {
      const status = error.response.status;
      if (status >= 400 && status < 500 && status !== 429) {
        return false;
      }
    }
    
    // Retry on server errors, network errors, etc.
    return true;
  }

  /**
   * Handle API errors and convert to appropriate exceptions
   */
  private handleError(error: unknown, orderId: string): void {
    const axiosError = error as AxiosError<{ error?: { code?: string; message?: string } }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const errorData = axiosError.response.data?.error;

      this.logger.error(
        `Order service error for order ${orderId}: ${status} - ${JSON.stringify(errorData)}`
      );

      if (status === 404) {
        throw new OrderNotFoundException(orderId);
      }

      throw new OrderServiceUnavailableException({
        orderId,
        status,
        error: errorData,
      });
    }

    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
      this.logger.error(
        `Order service connection error: ${axiosError.code}`
      );
      throw new OrderServiceUnavailableException({
        orderId,
        error: axiosError.code,
      });
    }

    this.logger.error(
      `Unknown error calling order service: ${axiosError.message || 'Unknown'}`
    );
    throw new OrderServiceUnavailableException({
      orderId,
      error: axiosError.message,
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
