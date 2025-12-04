'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { orderService } from '@/services/order.service';
import type {
  Order,
  OrderDetail,
  CreateOrderRequest,
  ApiError,
  PaginatedResponse,
} from '@/types';

/**
 * Hook to fetch paginated orders
 */
export function useOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', params],
    queryFn: () => orderService.getOrders(params),
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
 * Hook to fetch all orders for VPS list (active instances)
 */
export function useActiveOrders() {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', 'active'],
    queryFn: () =>
      orderService.getOrders({ status: 'ACTIVE', limit: 100 }),
    staleTime: 30 * 1000,
    placeholderData: {
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    },
  });
}

/**
 * Hook to fetch single order details
 */
export function useOrder(orderId: string | null) {
  return useQuery<OrderDetail>({
    queryKey: ['orders', orderId],
    queryFn: () => orderService.getOrderById(orderId!),
    enabled: !!orderId,
    staleTime: 30 * 1000, // 30 seconds - order status can change
  });
}

/**
 * Hook to create a new order
 */
export function useCreateOrder() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<Order, AxiosError<ApiError>, CreateOrderRequest>({
    mutationFn: orderService.createOrder,
    onSuccess: (data) => {
      toast.success('Pesanan berhasil dibuat!');
      // Invalidate orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentOrders'] });
      // Redirect to order detail page
      router.push(`/order/${data.id}`);
    },
    onError: (error) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal membuat pesanan. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook to cancel an order
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation<Order, AxiosError<ApiError>, string>({
    mutationFn: orderService.cancelOrder,
    onSuccess: (data) => {
      toast.success('Pesanan berhasil dibatalkan');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', data.id] });
      queryClient.invalidateQueries({ queryKey: ['orderStats'] });
      queryClient.invalidateQueries({ queryKey: ['recentOrders'] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal membatalkan pesanan. Silakan coba lagi.';
      toast.error(message);
    },
  });
}
