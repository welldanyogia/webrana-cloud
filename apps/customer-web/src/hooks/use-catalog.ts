'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { catalogService } from '@/services/catalog.service';
import type { VpsPlan, OsImage, CouponValidationResponse } from '@/types';

/**
 * Hook to fetch both plans and images (combined catalog)
 */
export function useCatalog() {
  const plansQuery = useQuery<VpsPlan[]>({
    queryKey: ['plans'],
    queryFn: catalogService.getPlans,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });

  const imagesQuery = useQuery<OsImage[]>({
    queryKey: ['images'],
    queryFn: catalogService.getImages,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });

  return {
    data: {
      plans: plansQuery.data ?? [],
      images: imagesQuery.data ?? [],
    },
    isLoading: plansQuery.isLoading || imagesQuery.isLoading,
    isError: plansQuery.isError || imagesQuery.isError,
    error: plansQuery.error || imagesQuery.error,
  };
}

/**
 * Hook to fetch all VPS plans
 */
export function usePlans() {
  return useQuery<VpsPlan[]>({
    queryKey: ['plans'],
    queryFn: catalogService.getPlans,
    staleTime: 5 * 60 * 1000, // 5 minutes - plans don't change often
    // Provide placeholder/fallback data while loading
    placeholderData: [],
  });
}

/**
 * Hook to fetch a single plan by ID
 */
export function usePlan(planId: string | null) {
  return useQuery<VpsPlan>({
    queryKey: ['plans', planId],
    queryFn: () => catalogService.getPlanById(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch all OS images
 */
export function useImages() {
  return useQuery<OsImage[]>({
    queryKey: ['images'],
    queryFn: catalogService.getImages,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: [],
  });
}

/**
 * Hook to fetch a single OS image by ID
 */
export function useImage(imageId: string | null) {
  return useQuery<OsImage>({
    queryKey: ['images', imageId],
    queryFn: () => catalogService.getImageById(imageId!),
    enabled: !!imageId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to validate a coupon code
 */
export function useValidateCoupon() {
  return useMutation<
    CouponValidationResponse,
    Error,
    { code: string; planId?: string }
  >({
    mutationFn: ({ code, planId }) => catalogService.validateCoupon(code, planId),
  });
}
