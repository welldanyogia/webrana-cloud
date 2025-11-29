import { internalApiClient } from '@/lib/api-client';
import type {
  ApiResponse,
  Order,
  OrderDetail,
  AdminStats,
  AdminUser,
  PaginatedResponse,
  OrderFilters,
  UserFilters,
  UpdatePaymentStatusRequest,
} from '@/types';

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await internalApiClient.get<ApiResponse<AdminStats>>(
    '/internal/stats'
  );
  return response.data.data;
}

/**
 * Get all orders (admin view)
 */
export async function getAdminOrders(
  filters?: OrderFilters
): Promise<PaginatedResponse<Order>> {
  const searchParams = new URLSearchParams();
  if (filters?.page) searchParams.set('page', filters.page.toString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.status) searchParams.set('status', filters.status);
  if (filters?.search) searchParams.set('search', filters.search);
  if (filters?.startDate) searchParams.set('startDate', filters.startDate);
  if (filters?.endDate) searchParams.set('endDate', filters.endDate);

  const queryString = searchParams.toString();
  const url = queryString ? `/internal/orders?${queryString}` : '/internal/orders';

  const response = await internalApiClient.get<ApiResponse<PaginatedResponse<Order>>>(url);
  return response.data.data;
}

/**
 * Get single order detail (admin view)
 */
export async function getAdminOrderDetail(orderId: string): Promise<OrderDetail> {
  const response = await internalApiClient.get<ApiResponse<OrderDetail>>(
    `/internal/orders/${orderId}`
  );
  return response.data.data;
}

/**
 * Update order payment status (admin override)
 */
export async function updatePaymentStatus(
  orderId: string,
  data: UpdatePaymentStatusRequest
): Promise<Order> {
  const response = await internalApiClient.post<ApiResponse<Order>>(
    `/internal/orders/${orderId}/payment-status`,
    data
  );
  return response.data.data;
}

/**
 * Get all users (admin view)
 */
export async function getAdminUsers(
  filters?: UserFilters
): Promise<PaginatedResponse<AdminUser>> {
  const searchParams = new URLSearchParams();
  if (filters?.page) searchParams.set('page', filters.page.toString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.search) searchParams.set('search', filters.search);

  const queryString = searchParams.toString();
  const url = queryString ? `/internal/users?${queryString}` : '/internal/users';

  const response = await internalApiClient.get<ApiResponse<PaginatedResponse<AdminUser>>>(url);
  return response.data.data;
}

/**
 * Get single user detail (admin view)
 */
export async function getAdminUserDetail(userId: string): Promise<AdminUser> {
  const response = await internalApiClient.get<ApiResponse<AdminUser>>(
    `/internal/users/${userId}`
  );
  return response.data.data;
}

/**
 * Get user's orders (admin view)
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  const response = await internalApiClient.get<ApiResponse<Order[]>>(
    `/internal/users/${userId}/orders`
  );
  return response.data.data;
}

export const adminService = {
  getAdminStats,
  getAdminOrders,
  getAdminOrderDetail,
  updatePaymentStatus,
  getAdminUsers,
  getAdminUserDetail,
  getUserOrders,
};

export default adminService;
