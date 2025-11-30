import apiClient from '@/lib/api-client';
import type {
  ApiResponse,
  Notification,
  NotificationPaginatedResult,
  UnreadCountResponse,
} from '@/types';

const NOTIFICATIONS_BASE = '/notifications';

/**
 * Get list of user notifications
 */
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  isRead?: boolean;
}): Promise<NotificationPaginatedResult> {
  const response = await apiClient.get<NotificationPaginatedResult>(
    NOTIFICATIONS_BASE,
    { params }
  );
  return response.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiClient.get<ApiResponse<UnreadCountResponse>>(
    `${NOTIFICATIONS_BASE}/unread-count`
  );
  return response.data.data;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(id: string): Promise<Notification> {
  const response = await apiClient.post<ApiResponse<Notification>>(
    `${NOTIFICATIONS_BASE}/${id}/read`
  );
  return response.data.data;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  await apiClient.post(`${NOTIFICATIONS_BASE}/read-all`);
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  await apiClient.delete(`${NOTIFICATIONS_BASE}/${id}`);
}

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
