'use client';

import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import type { UserFilters } from '@/types';

/**
 * Hook to get all users for admin
 */
export function useAdminUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: ['adminUsers', filters],
    queryFn: () => adminService.getAdminUsers(filters),
    staleTime: 60 * 1000, // 1 minute
    placeholderData: {
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    },
  });
}

/**
 * Hook to get single user detail for admin
 */
export function useAdminUserDetail(userId: string) {
  return useQuery({
    queryKey: ['adminUser', userId],
    queryFn: () => adminService.getAdminUserDetail(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to get user's orders
 */
export function useUserOrders(userId: string) {
  return useQuery({
    queryKey: ['userOrders', userId],
    queryFn: () => adminService.getUserOrders(userId),
    enabled: !!userId,
    staleTime: 30 * 1000,
    placeholderData: [],
  });
}
