import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  useNotificationsList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from './use-notifications';

import { createWrapper } from '@/test/test-utils';

// Mock the notification service
vi.mock('@/services/notification.service', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

// Mock auth store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'mock-token',
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Test User' },
  })),
}));

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}));

import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/services/notification.service';

const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Pembayaran Berhasil',
    message: 'Pembayaran untuk VPS Standard telah berhasil.',
    type: 'payment' as const,
    actionUrl: '/orders/order-123',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    title: 'VPS Aktif',
    message: 'VPS Anda telah aktif.',
    type: 'vps' as const,
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

const mockNotificationsResponse = {
  data: mockNotifications,
  meta: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
};

const mockUnreadCountResponse = {
  count: 1,
};

describe('Notification hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNotificationsList', () => {
    it('should fetch notifications list', async () => {
      vi.mocked(getNotifications).mockResolvedValue(mockNotificationsResponse);

      const { result } = renderHook(() => useNotificationsList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotificationsResponse);
      expect(getNotifications).toHaveBeenCalledWith(undefined);
    });

    it('should pass filter params', async () => {
      vi.mocked(getNotifications).mockResolvedValue(mockNotificationsResponse);

      const params = { page: 2, limit: 5, isRead: false };
      const { result } = renderHook(() => useNotificationsList(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getNotifications).toHaveBeenCalledWith(params);
    });

    it('should handle error', async () => {
      vi.mocked(getNotifications).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => useNotificationsList(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUnreadCount', () => {
    it('should fetch unread count', async () => {
      vi.mocked(getUnreadCount).mockResolvedValue(mockUnreadCountResponse);

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUnreadCountResponse);
    });

    it('should handle error', async () => {
      vi.mocked(getUnreadCount).mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useMarkAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(markAsRead).mockResolvedValue(mockNotifications[0]);

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(markAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should handle error', async () => {
      vi.mocked(markAsRead).mockRejectedValue(new Error('Failed to mark'));

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate('notif-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useMarkAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(markAllAsRead).mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkAllAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(markAllAsRead).toHaveBeenCalled();
    });

    it('should handle error', async () => {
      vi.mocked(markAllAsRead).mockRejectedValue(new Error('Failed to mark'));

      const { result } = renderHook(() => useMarkAllAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
