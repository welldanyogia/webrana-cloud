import { apiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  Order,
  OrderDetail,
  CreateOrderRequest,
  PaginatedResponse,
} from '@/types';

/**
 * Create a new order
 */
export async function createOrder(data: CreateOrderRequest): Promise<Order> {
  const response = await apiClient.post<ApiResponse<Order>>('/orders', data);
  return response.data.data;
}

/**
 * Fetch all orders for current user
 */
export async function getOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<Order>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.status) searchParams.set('status', params.status);

  const queryString = searchParams.toString();
  const url = queryString ? `/orders?${queryString}` : '/orders';

  const response = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>(url);
  return response.data.data;
}

/**
 * Fetch single order by ID with full details
 */
export async function getOrderById(orderId: string): Promise<OrderDetail> {
  const response = await apiClient.get<ApiResponse<OrderDetail>>(
    `/orders/${orderId}`
  );
  return response.data.data;
}

/**
 * Cancel an order (only for pending payment orders)
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  const response = await apiClient.post<ApiResponse<Order>>(
    `/orders/${orderId}/cancel`
  );
  return response.data.data;
}

export const orderService = {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
};

export default orderService;
