import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAdminStats,
  getAdminOrders,
  getAdminOrderDetail,
  updatePaymentStatus,
  getAdminUsers,
  getAdminUserDetail,
  getUserOrders,
  adminService,
} from './admin.service';

// Mock the api client
vi.mock('@/lib/api-client', () => ({
  localApiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { localApiClient } from '@/lib/api-client';

const mockStats = {
  totalOrders: 100,
  totalRevenue: 15000000,
  activeUsers: 50,
  pendingOrders: 5,
};

const mockOrder = {
  id: 'order-1',
  userId: 'user-1',
  planId: 'plan-1',
  imageId: 'image-1',
  status: 'ACTIVE' as const,
  totalAmount: 150000,
  duration: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockOrdersResponse = {
  items: [mockOrder],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CUSTOMER' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockUsersResponse = {
  items: [mockUser],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

describe('admin.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAdminStats', () => {
    it('should fetch admin statistics', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockStats },
      });

      const result = await getAdminStats();

      expect(localApiClient.get).toHaveBeenCalledWith('/api/admin/stats');
      expect(result).toEqual(mockStats);
    });

    it('should throw error on failure', async () => {
      vi.mocked(localApiClient.get).mockRejectedValue(new Error('Network error'));

      await expect(getAdminStats()).rejects.toThrow('Network error');
    });
  });

  describe('getAdminOrders', () => {
    it('should fetch orders without filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      const result = await getAdminOrders();

      expect(localApiClient.get).toHaveBeenCalledWith('/api/admin/orders');
      expect(result).toEqual(mockOrdersResponse);
    });

    it('should fetch orders with pagination filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      await getAdminOrders({ page: 2, limit: 20 });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/orders?page=2&limit=20'
      );
    });

    it('should fetch orders with status filter', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      await getAdminOrders({ status: 'PENDING_PAYMENT' });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/orders?status=PENDING_PAYMENT'
      );
    });

    it('should fetch orders with search filter', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      await getAdminOrders({ search: 'test' });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/orders?search=test'
      );
    });

    it('should fetch orders with date range filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      await getAdminOrders({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/orders?startDate=2024-01-01&endDate=2024-01-31'
      );
    });

    it('should combine multiple filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockOrdersResponse },
      });

      await getAdminOrders({
        page: 1,
        limit: 10,
        status: 'ACTIVE',
        search: 'test',
      });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/orders?page=1&limit=10&status=ACTIVE&search=test'
      );
    });
  });

  describe('getAdminOrderDetail', () => {
    it('should fetch order detail by ID', async () => {
      const orderDetail = { ...mockOrder, plan: {}, image: {} };
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: orderDetail },
      });

      const result = await getAdminOrderDetail('order-1');

      expect(localApiClient.get).toHaveBeenCalledWith('/api/admin/orders/order-1');
      expect(result).toEqual(orderDetail);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status', async () => {
      const updatedOrder = { ...mockOrder, status: 'PAYMENT_RECEIVED' as const };
      vi.mocked(localApiClient.post).mockResolvedValue({
        data: { data: updatedOrder },
      });

      const result = await updatePaymentStatus('order-1', {
        status: 'PAYMENT_RECEIVED',
        note: 'Manual verification',
      });

      expect(localApiClient.post).toHaveBeenCalledWith(
        '/api/admin/orders/order-1/payment-status',
        { status: 'PAYMENT_RECEIVED', note: 'Manual verification' }
      );
      expect(result).toEqual(updatedOrder);
    });
  });

  describe('getAdminUsers', () => {
    it('should fetch users without filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockUsersResponse },
      });

      const result = await getAdminUsers();

      expect(localApiClient.get).toHaveBeenCalledWith('/api/admin/users');
      expect(result).toEqual(mockUsersResponse);
    });

    it('should fetch users with filters', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockUsersResponse },
      });

      await getAdminUsers({ page: 2, limit: 20, search: 'john' });

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/users?page=2&limit=20&search=john'
      );
    });
  });

  describe('getAdminUserDetail', () => {
    it('should fetch user detail by ID', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: mockUser },
      });

      const result = await getAdminUserDetail('user-1');

      expect(localApiClient.get).toHaveBeenCalledWith('/api/admin/users/user-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserOrders', () => {
    it('should fetch user orders', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: { orders: [mockOrder] } },
      });

      const result = await getUserOrders('user-1');

      expect(localApiClient.get).toHaveBeenCalledWith(
        '/api/admin/users/user-1?includeOrders=true'
      );
      expect(result).toEqual([mockOrder]);
    });

    it('should return empty array if no orders', async () => {
      vi.mocked(localApiClient.get).mockResolvedValue({
        data: { data: {} },
      });

      const result = await getUserOrders('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('adminService export', () => {
    it('should export all functions', () => {
      expect(adminService.getAdminStats).toBe(getAdminStats);
      expect(adminService.getAdminOrders).toBe(getAdminOrders);
      expect(adminService.getAdminOrderDetail).toBe(getAdminOrderDetail);
      expect(adminService.updatePaymentStatus).toBe(updatePaymentStatus);
      expect(adminService.getAdminUsers).toBe(getAdminUsers);
      expect(adminService.getAdminUserDetail).toBe(getAdminUserDetail);
      expect(adminService.getUserOrders).toBe(getUserOrders);
    });
  });
});
