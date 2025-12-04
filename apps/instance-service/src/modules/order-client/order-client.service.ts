import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

import { OrderServiceUnavailableException } from '../../common/exceptions';

// Order types matching order-service response
export interface ProvisioningTask {
  id: string;
  status: string;
  dropletId: string | null;
  dropletName: string | null;
  dropletStatus: string | null;
  ipv4Public: string | null;
  ipv4Private: string | null;
  doRegion: string | null;
  doSize: string | null;
  doImage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface OrderItem {
  id: string;
  planId: string;
  imageId: string;
  duration: string;
  planSnapshot: {
    name: string;
    cpu: number;
    ram: number;
    ssd: number;
    bandwidth: number;
  };
  imageSnapshot: {
    name: string;
    distribution: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  basePrice: number;
  promoDiscount: number;
  couponDiscount: number;
  finalPrice: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  provisioningTask: ProvisioningTask | null;
}

export interface PaginatedOrdersResponse {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Order Service Client
 * 
 * Fetches order/instance data from order-service internal API.
 * 
 * Environment variables:
 * - ORDER_SERVICE_URL: Base URL for order-service (default: http://localhost:3003)
 * - INTERNAL_API_KEY: API key for internal endpoints
 */
@Injectable()
export class OrderClientService {
  private readonly logger = new Logger(OrderClientService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>(
      'ORDER_SERVICE_URL',
      'http://localhost:3003'
    );
    const apiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: this.configService.get<number>('ORDER_SERVICE_TIMEOUT_MS', 5000),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
    });
  }

  /**
   * Get orders for a user with ACTIVE status (provisioned VPS instances)
   * 
   * GET /api/v1/internal/orders?userId={userId}&status=ACTIVE
   */
  async getActiveOrdersByUserId(userId: string): Promise<Order[]> {
    this.logger.debug(`Fetching active orders for user: ${userId}`);

    try {
      const response = await this.client.get<PaginatedOrdersResponse>(
        '/api/v1/internal/orders',
        {
          params: {
            userId,
            status: 'ACTIVE',
            limit: 100, // Get all active instances
          },
        }
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'getActiveOrdersByUserId', { userId });
    }
  }

  /**
   * Get a single order by ID
   * 
   * GET /api/v1/internal/orders/{orderId}
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    this.logger.debug(`Fetching order: ${orderId}`);

    try {
      const response = await this.client.get<{ data: Order }>(
        `/api/v1/internal/orders/${orderId}`
      );

      return response.data.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      this.handleApiError(error, 'getOrderById', { orderId });
    }
  }

  /**
   * Handle API errors and convert to custom exceptions
   */
  private handleApiError(
    error: unknown,
    method: string,
    context: Record<string, unknown>
  ): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      this.logger.error(
        `Order service error in ${method}: ${status} - ${message}`,
        { context, responseData: error.response?.data }
      );

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new OrderServiceUnavailableException({
          method,
          ...context,
          errorCode: error.code,
        });
      }

      throw new OrderServiceUnavailableException({
        method,
        ...context,
        errorCode: `HTTP_${status}`,
        message,
      });
    }

    this.logger.error(`Unexpected error in ${method}:`, error);
    throw new OrderServiceUnavailableException({
      method,
      ...context,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
