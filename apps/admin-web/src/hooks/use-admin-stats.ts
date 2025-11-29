'use client';

import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import type { AdminStats } from '@/types';

/**
 * Hook to get admin dashboard statistics
 */
export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminService.getAdminStats(),
    staleTime: 60 * 1000, // 1 minute
    // Placeholder data for when API is not available
    placeholderData: {
      ordersToday: 0,
      pendingPayment: 0,
      revenueToday: 0,
      activeVps: 0,
      totalUsers: 0,
      totalOrders: 0,
    } as AdminStats,
  });
}
