import { localApiClient } from '@/lib/api-client';
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
 * Uses server-side API route to protect internal API key
 */
export async function getAdminStats(): Promise<AdminStats> {
  const response = await localApiClient.get<ApiResponse<AdminStats>>(
    '/api/admin/stats'
  );
  return response.data.data;
}

/**
 * Get all orders (admin view)
 * Uses server-side API route to protect internal API key
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
  const url = queryString ? `/api/admin/orders?${queryString}` : '/api/admin/orders';

  const response = await localApiClient.get<ApiResponse<PaginatedResponse<Order>>>(url);
  return response.data.data;
}

/**
 * Get single order detail (admin view)
 * Uses server-side API route to protect internal API key
 */
export async function getAdminOrderDetail(orderId: string): Promise<OrderDetail> {
  const response = await localApiClient.get<ApiResponse<OrderDetail>>(
    `/api/admin/orders/${orderId}`
  );
  return response.data.data;
}

/**
 * Update order payment status (admin override)
 * Uses server-side API route to protect internal API key
 */
export async function updatePaymentStatus(
  orderId: string,
  data: UpdatePaymentStatusRequest
): Promise<Order> {
  const response = await localApiClient.post<ApiResponse<Order>>(
    `/api/admin/orders/${orderId}/payment-status`,
    data
  );
  return response.data.data;
}

/**
 * Get all users (admin view)
 * Uses server-side API route to protect internal API key
 */
export async function getAdminUsers(
  filters?: UserFilters
): Promise<PaginatedResponse<AdminUser>> {
  const searchParams = new URLSearchParams();
  if (filters?.page) searchParams.set('page', filters.page.toString());
  if (filters?.limit) searchParams.set('limit', filters.limit.toString());
  if (filters?.search) searchParams.set('search', filters.search);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/admin/users?${queryString}` : '/api/admin/users';

  const response = await localApiClient.get<ApiResponse<PaginatedResponse<AdminUser>>>(url);
  return response.data.data;
}

/**
 * Get single user detail (admin view)
 * Uses server-side API route to protect internal API key
 */
export async function getAdminUserDetail(userId: string): Promise<AdminUser> {
  const response = await localApiClient.get<ApiResponse<AdminUser>>(
    `/api/admin/users/${userId}`
  );
  return response.data.data;
}

/**
 * Get user's orders (admin view)
 * Uses server-side API route to protect internal API key
 */
export async function getUserOrders(userId: string): Promise<Order[]> {
  const response = await localApiClient.get<ApiResponse<{ orders: Order[] }>>(
    `/api/admin/users/${userId}?includeOrders=true`
  );
  return response.data.data.orders || [];
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
