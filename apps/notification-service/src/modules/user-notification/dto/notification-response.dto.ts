/**
 * Response DTO for a single in-app notification
 */
export interface InAppNotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

/**
 * Response DTO for paginated notification list
 */
export interface NotificationListResponseDto {
  data: InAppNotificationResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Response DTO for unread count
 */
export interface UnreadCountResponseDto {
  count: number;
}

/**
 * Response DTO for mark as read/delete operations
 */
export interface NotificationActionResponseDto {
  success: boolean;
  message: string;
}
