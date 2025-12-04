'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import type { ApiResponse, OrderStats, Order } from '@/types';

/**
 * Hook to get order statistics for dashboard
 */
export function useOrderStats() {
  return useQuery({
    queryKey: ['orderStats'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<OrderStats>>(
        '/orders/stats'
      );
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    // For demo/mock purposes, return mock data if API fails
    placeholderData: {
      activeVps: 0,
      pendingOrders: 0,
      totalSpent: 0,
    },
  });
}

/**
 * Hook to get recent orders for dashboard
 */
export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ['recentOrders', limit],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<Order[]>>(
        `/orders?limit=${limit}&sort=createdAt:desc`
      );
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    // For demo/mock purposes, return empty array if API fails
    placeholderData: [],
  });
}
