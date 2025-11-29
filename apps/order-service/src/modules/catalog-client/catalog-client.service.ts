import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import {
  CatalogServiceUnavailableException,
  InvalidPlanException,
  InvalidImageException,
  InvalidCouponException,
} from '../../common/exceptions';

// Response interfaces based on catalog-service contracts
export interface PlanPricing {
  id: string;
  duration: 'MONTHLY' | 'YEARLY';
  price: number;
  cost: number;
  isActive: boolean;
}

export interface PlanPromo {
  id: string;
  name: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CatalogPlan {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  cpu: number;
  memoryMb: number;
  diskGb: number;
  bandwidthTb: number;
  provider: string;
  providerSizeSlug: string;
  isActive: boolean;
  sortOrder: number;
  tags: string[];
  pricings: PlanPricing[];
  promos: PlanPromo[];
}

export interface CatalogImage {
  id: string;
  provider: string;
  providerSlug: string;
  displayName: string;
  description: string | null;
  category: 'OS' | 'APP';
  version: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CouponValidationResult {
  valid: boolean;
  discountAmount?: number;
  finalPrice?: number;
  coupon?: {
    code: string;
    name: string;
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
  };
  reason?: string;
}

export interface ValidateCouponDto {
  code: string;
  planId?: string;
  userId?: string;
  amount: number;
}

@Injectable()
export class CatalogClientService {
  private readonly logger = new Logger(CatalogClientService.name);

  constructor(private readonly httpService: HttpService) {}

  async getPlanById(planId: string): Promise<CatalogPlan> {
    this.logger.debug(`Fetching plan: ${planId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: CatalogPlan }>(`/api/v1/catalog/plans/${planId}`).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'getPlanById', { planId });
            throw error;
          })
        )
      );

      const plan = response.data.data;

      if (!plan) {
        throw new InvalidPlanException(planId, 'Plan not found');
      }

      if (!plan.isActive) {
        throw new InvalidPlanException(planId, 'Plan is not active');
      }

      return plan;
    } catch (error) {
      if (error instanceof InvalidPlanException) {
        throw error;
      }
      throw this.wrapError(error, 'getPlanById');
    }
  }

  async getImageById(imageId: string): Promise<CatalogImage> {
    this.logger.debug(`Fetching image: ${imageId}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ data: CatalogImage }>(`/api/v1/catalog/images/${imageId}`).pipe(
          catchError((error: AxiosError) => {
            this.handleAxiosError(error, 'getImageById', { imageId });
            throw error;
          })
        )
      );

      const image = response.data.data;

      if (!image) {
        throw new InvalidImageException(imageId, 'Image not found');
      }

      if (!image.isActive) {
        throw new InvalidImageException(imageId, 'Image is not active');
      }

      return image;
    } catch (error) {
      if (error instanceof InvalidImageException) {
        throw error;
      }
      throw this.wrapError(error, 'getImageById');
    }
  }

  async validateCoupon(dto: ValidateCouponDto): Promise<CouponValidationResult> {
    this.logger.debug(`Validating coupon: ${dto.code}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<{ data: CouponValidationResult }>('/api/v1/catalog/coupons/validate', dto)
          .pipe(
            catchError((error: AxiosError) => {
              this.handleAxiosError(error, 'validateCoupon', { code: dto.code });
              throw error;
            })
          )
      );

      const result = response.data.data;

      if (!result.valid) {
        throw new InvalidCouponException(dto.code, result.reason || 'Coupon is not valid');
      }

      return result;
    } catch (error) {
      if (error instanceof InvalidCouponException) {
        throw error;
      }
      throw this.wrapError(error, 'validateCoupon');
    }
  }

  private handleAxiosError(
    error: AxiosError,
    method: string,
    context: Record<string, unknown>
  ): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as Record<string, unknown>;

      this.logger.warn(
        `Catalog service returned ${status} for ${method}`,
        { context, data }
      );

      if (status === 404) {
        // Let the caller handle 404 specifically
        return;
      }

      if (status >= 400 && status < 500) {
        // Client error from catalog service
        return;
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      this.logger.error(
        `Catalog service unavailable: ${error.message}`,
        { method, context }
      );
      throw new CatalogServiceUnavailableException({
        method,
        ...context,
        errorCode: error.code,
      });
    }
  }

  private wrapError(error: unknown, method: string): never {
    if (
      error instanceof InvalidPlanException ||
      error instanceof InvalidImageException ||
      error instanceof InvalidCouponException ||
      error instanceof CatalogServiceUnavailableException
    ) {
      throw error;
    }

    if (error instanceof Error) {
      this.logger.error(`Unexpected error in ${method}: ${error.message}`, error.stack);
    }

    throw new CatalogServiceUnavailableException({
      method,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
