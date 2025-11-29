import { Type } from 'class-transformer';
import { IsString, IsEnum, IsOptional, IsObject, IsNumber, Min, Max } from 'class-validator';

/**
 * Notification Events
 */
export enum NotificationEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  VPS_ACTIVE = 'VPS_ACTIVE',
  PROVISIONING_FAILED = 'PROVISIONING_FAILED',
  VPS_EXPIRING = 'VPS_EXPIRING',
  GENERIC = 'GENERIC',
}

/**
 * Send Notification Request DTO
 */
export class SendNotificationDto {
  @IsEnum(NotificationEventType)
  event!: NotificationEventType;

  @IsString()
  userId!: string;

  @IsObject()
  data!: Record<string, any>;
}

/**
 * Order Created Data
 */
export interface OrderCreatedNotificationData {
  orderNumber: string;
  planName: string;
  duration: number;
  durationUnit: string;
  basePrice: number;
  discount?: number;
  finalPrice: number;
  invoiceUrl?: string;
}

/**
 * Payment Confirmed Data
 */
export interface PaymentConfirmedNotificationData {
  orderNumber: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
}

/**
 * VPS Active Data
 */
export interface VpsActiveNotificationData {
  orderNumber: string;
  planName: string;
  ipAddress: string;
  hostname: string;
  username: string;
  password: string;
  osName: string;
  region: string;
  expiresAt: string;
}

/**
 * Provisioning Failed Data
 */
export interface ProvisioningFailedNotificationData {
  orderNumber: string;
  planName: string;
  errorMessage: string;
  supportEmail?: string;
}

/**
 * List Notification Logs Query DTO
 */
export class ListNotificationLogsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * Notification Log Response DTO
 */
export interface NotificationLogResponseDto {
  id: string;
  userId: string;
  event: string;
  channel: string;
  status: string;
  recipient: string;
  subject?: string;
  error?: string;
  sentAt?: string;
  createdAt: string;
}

/**
 * Notification Log List Response DTO
 */
export interface NotificationLogListResponseDto {
  data: NotificationLogResponseDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Send Notification Response DTO
 */
export interface SendNotificationResponseDto {
  success: boolean;
  message: string;
  notifications: {
    channel: string;
    status: string;
    recipient?: string;
    error?: string;
    jobId?: string;
  }[];
}
