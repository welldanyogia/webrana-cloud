'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import { adminService } from '@/services/admin.service';
import type { OrderFilters, UpdatePaymentStatusRequest, ApiError } from '@/types';

/**
 * Hook to get all orders for admin
 */
export function useAdminOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['adminOrders', filters],
    queryFn: () => adminService.getAdminOrders(filters),
    staleTime: 30 * 1000, // 30 seconds
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
 * Hook to get recent orders for admin dashboard
 */
export function useAdminRecentOrders(limit = 10) {
  return useQuery({
    queryKey: ['adminRecentOrders', limit],
    queryFn: () => adminService.getAdminOrders({ limit, page: 1 }),
    staleTime: 30 * 1000, // 30 seconds
    select: (data) => data.items,
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
 * Hook to get single order detail for admin
 */
export function useAdminOrderDetail(orderId: string) {
  return useQuery({
    queryKey: ['adminOrder', orderId],
    queryFn: () => adminService.getAdminOrderDetail(orderId),
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to update order payment status
 */
export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: UpdatePaymentStatusRequest;
    }) => adminService.updatePaymentStatus(orderId, data),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminRecentOrders'] });
      queryClient.invalidateQueries({ queryKey: ['adminOrder', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });

      const statusText = variables.data.status === 'PAID' ? 'dibayar' : 'gagal';
      toast.success(`Status pembayaran berhasil diubah ke ${statusText}`);
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal mengubah status pembayaran. Silakan coba lagi.';
      toast.error(message);
    },
  });
}
