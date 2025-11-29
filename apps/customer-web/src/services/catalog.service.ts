import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  VpsPlan,
  OsImage,
  CouponValidationResponse,
} from '@/types';

const CATALOG_SERVICE_URL = process.env.NEXT_PUBLIC_CATALOG_SERVICE_URL || '/catalog';

/**
 * Fetch all active VPS plans
 */
export async function getPlans(): Promise<VpsPlan[]> {
  const response = await apiClient.get<ApiResponse<VpsPlan[]>>(
    `${CATALOG_SERVICE_URL}/plans`
  );
  return response.data.data;
}

/**
 * Fetch single plan by ID
 */
export async function getPlanById(planId: string): Promise<VpsPlan> {
  const response = await apiClient.get<ApiResponse<VpsPlan>>(
    `${CATALOG_SERVICE_URL}/plans/${planId}`
  );
  return response.data.data;
}

/**
 * Fetch all active OS images
 */
export async function getImages(): Promise<OsImage[]> {
  const response = await apiClient.get<ApiResponse<OsImage[]>>(
    `${CATALOG_SERVICE_URL}/images`
  );
  return response.data.data;
}

/**
 * Fetch single OS image by ID
 */
export async function getImageById(imageId: string): Promise<OsImage> {
  const response = await apiClient.get<ApiResponse<OsImage>>(
    `${CATALOG_SERVICE_URL}/images/${imageId}`
  );
  return response.data.data;
}

/**
 * Validate a coupon code
 */
export async function validateCoupon(
  code: string,
  planId?: string
): Promise<CouponValidationResponse> {
  const response = await apiClient.post<ApiResponse<CouponValidationResponse>>(
    `${CATALOG_SERVICE_URL}/coupons/validate`,
    { code, planId }
  );
  return response.data.data;
}

export const catalogService = {
  getPlans,
  getPlanById,
  getImages,
  getImageById,
  validateCoupon,
};

export default catalogService;
