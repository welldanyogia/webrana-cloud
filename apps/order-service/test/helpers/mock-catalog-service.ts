/**
 * Mock Catalog Service Responses
 * 
 * Provides mock data for catalog-service API calls in integration tests.
 * These mocks simulate the real catalog-service responses without making HTTP calls.
 */

import {
  InvalidPlanException,
  InvalidImageException,
  InvalidCouponException,
} from '../../src/common/exceptions';

// Use valid UUID v4 format for IDs (required by DTO validation)
export const MOCK_PLAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const MOCK_IMAGE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const MOCK_VALID_COUPON = 'HEMAT20';
export const MOCK_INVALID_COUPON = 'EXPIRED123';

/**
 * Mock Plan Response
 */
export const mockPlanResponse = {
  id: MOCK_PLAN_ID,
  name: 'basic-vps-1vcpu-1gb',
  displayName: 'Basic VPS 1vCPU 1GB',
  description: 'Entry-level VPS with 1 vCPU and 1GB RAM',
  cpu: 1,
  memoryMb: 1024,
  diskGb: 25,
  bandwidthTb: 1,
  provider: 'DIGITALOCEAN',
  providerSizeSlug: 's-1vcpu-1gb',
  isActive: true,
  sortOrder: 1,
  tags: ['vps', 'basic'],
  pricings: [
    {
      id: 'pricing-monthly',
      duration: 'MONTHLY',
      price: 100000,
      cost: 80000,
      isActive: true,
    },
    {
      id: 'pricing-yearly',
      duration: 'YEARLY',
      price: 960000,
      cost: 768000,
      isActive: true,
    },
  ],
  promos: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock Image Response
 */
export const mockImageResponse = {
  id: MOCK_IMAGE_ID,
  provider: 'DIGITALOCEAN',
  providerSlug: 'ubuntu-22-04-x64',
  displayName: 'Ubuntu 22.04 LTS',
  description: 'Ubuntu 22.04 LTS (Jammy Jellyfish)',
  category: 'OS' as const,
  version: '22.04',
  isActive: true,
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/**
 * Mock Valid Coupon Response
 */
export const mockValidCouponResponse = {
  valid: true,
  coupon: {
    code: MOCK_VALID_COUPON,
    discountType: 'PERCENTAGE',
    discountValue: 20,
    minPurchase: 50000,
    maxDiscount: 50000,
    validFrom: '2024-01-01T00:00:00.000Z',
    validUntil: '2025-12-31T23:59:59.000Z',
  },
  originalPrice: 100000,
  discountAmount: 20000,
  finalPrice: 80000,
};

/**
 * Mock Invalid Coupon Response
 */
export const mockInvalidCouponResponse = {
  valid: false,
  reason: 'EXPIRED',
  message: 'Coupon has expired',
};

/**
 * Create mock CatalogClientService for testing
 */
export function createMockCatalogClientService() {
  return {
    getPlanById: jest.fn().mockImplementation((planId: string) => {
      if (planId === MOCK_PLAN_ID) {
        return Promise.resolve(mockPlanResponse);
      }
      // Throw the same exception as the real service
      return Promise.reject(new InvalidPlanException(planId, 'Plan not found'));
    }),

    getImageById: jest.fn().mockImplementation((imageId: string) => {
      if (imageId === MOCK_IMAGE_ID) {
        return Promise.resolve(mockImageResponse);
      }
      // Throw the same exception as the real service
      return Promise.reject(new InvalidImageException(imageId, 'Image not found'));
    }),

    validateCoupon: jest.fn().mockImplementation((dto: any) => {
      const code = typeof dto === 'string' ? dto : dto.code;
      if (code === MOCK_VALID_COUPON) {
        return Promise.resolve(mockValidCouponResponse);
      }
      // Throw the same exception as the real service
      return Promise.reject(new InvalidCouponException(code, 'Coupon is not valid'));
    }),
  };
}

/**
 * Get price for a specific duration from mock plan
 */
export function getMockPriceForDuration(duration: string): number {
  const pricing = mockPlanResponse.pricing.find(p => p.duration === duration);
  return pricing?.price || 100000;
}
