// Mock @prisma/client for notification-service tests
// This provides the enums used by the service without requiring Prisma generate

export const NotificationEvent = {
  ORDER_CREATED: 'ORDER_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  VPS_ACTIVE: 'VPS_ACTIVE',
  PROVISIONING_FAILED: 'PROVISIONING_FAILED',
  VPS_EXPIRING: 'VPS_EXPIRING',
  SYSTEM_ANNOUNCEMENT: 'SYSTEM_ANNOUNCEMENT',
  GENERIC: 'GENERIC',
} as const;

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  TELEGRAM: 'TELEGRAM',
} as const;

export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

// Export a mock PrismaClient class that can be extended
export class PrismaClient {
  $connect = jest.fn();
  $disconnect = jest.fn();
  $on = jest.fn();
}

// Type exports for TypeScript compatibility
export type NotificationEvent = typeof NotificationEvent[keyof typeof NotificationEvent];
export type NotificationChannel = typeof NotificationChannel[keyof typeof NotificationChannel];
export type NotificationStatus = typeof NotificationStatus[keyof typeof NotificationStatus];

export interface NotificationLog {
  id: string;
  userId: string;
  event: NotificationEvent;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  subject?: string | null;
  content?: string | null;
  payload?: any;
  error?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationEvent;
  actionUrl?: string | null;
  metadata?: any;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
}
