import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import {
  AuthServiceUnavailableException,
  UserNotFoundException,
} from '../../common/exceptions/notification.exceptions';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  telegramChatId?: string;
}

@Injectable()
export class AuthClientService {
  private readonly logger = new Logger(AuthClientService.name);
  private readonly apiKey: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelayMs: number = 1000;

  // Simple in-memory cache for user info
  private readonly userCache: Map<string, { data: UserInfo; timestamp: number }> = new Map();
  private readonly cacheTtlMs: number = 60000; // 1 minute

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('INTERNAL_API_KEY', '');

    if (!this.apiKey) {
      this.logger.warn(
        'INTERNAL_API_KEY is not configured. Auth service calls may fail.'
      );
    }
  }

  /**
   * Get user information by ID
   * 
   * Returns user email, name, and telegram chatId if available
   */
  async getUserById(userId: string): Promise<UserInfo> {
    // Check cache first
    const cached = this.getFromCache(userId);
    if (cached) {
      this.logger.debug(`Cache hit for user ${userId}`);
      return cached;
    }

    this.logger.log(`Fetching user info for userId: ${userId}`);

    return this.executeWithRetry(userId, async () => {
      const response = await firstValueFrom(
        this.httpService.get<{ data: UserInfo }>(
          `/api/v1/internal/users/${userId}`,
          {
            headers: {
              'X-API-Key': this.apiKey,
            },
          }
        )
      );

      const userInfo = response.data.data;
      
      // Store in cache
      this.setToCache(userId, userInfo);

      this.logger.log(`Successfully fetched user info for ${userId}`);

      return userInfo;
    });
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(userId: string): UserInfo | null {
    const cached = this.userCache.get(userId);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTtlMs;
    if (isExpired) {
      this.userCache.delete(userId);
      return null;
    }

    return cached.data;
  }

  /**
   * Store in cache
   */
  private setToCache(userId: string, data: UserInfo): void {
    this.userCache.set(userId, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache for a specific user
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.userCache.delete(userId);
    } else {
      this.userCache.clear();
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<T>(
    userId: string,
    fn: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      
      // Check if we should retry
      const shouldRetry = this.shouldRetryError(axiosError);
      
      if (shouldRetry && attempt < this.maxRetries) {
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms`
        );
        
        await this.sleep(delay);
        return this.executeWithRetry(userId, fn, attempt + 1);
      }

      // Convert to custom exception and throw
      this.handleError(error, userId);
      throw error;
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
  private handleError(error: unknown, userId: string): void {
    const axiosError = error as AxiosError<{ error?: { code?: string; message?: string } }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const errorData = axiosError.response.data?.error;

      this.logger.error(
        `Auth service error for user ${userId}: ${status} - ${JSON.stringify(errorData)}`
      );

      if (status === 404) {
        throw new UserNotFoundException(userId);
      }

      throw new AuthServiceUnavailableException({
        userId,
        status,
        error: errorData,
      });
    }

    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ETIMEDOUT') {
      this.logger.error(
        `Auth service connection error: ${axiosError.code}`
      );
      throw new AuthServiceUnavailableException({
        userId,
        error: axiosError.code,
      });
    }

    this.logger.error(
      `Unknown error calling auth service: ${axiosError.message || 'Unknown'}`
    );
    throw new AuthServiceUnavailableException({
      userId,
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
