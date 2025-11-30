import { IsString, IsEnum, IsOptional, IsObject, MaxLength } from 'class-validator';

/**
 * In-app notification types
 */
export enum InAppNotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  VPS_ACTIVE = 'VPS_ACTIVE',
  PROVISIONING_FAILED = 'PROVISIONING_FAILED',
  VPS_EXPIRING = 'VPS_EXPIRING',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

/**
 * DTO for creating an in-app notification (internal use)
 */
export class CreateInAppNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  message!: string;

  @IsEnum(InAppNotificationType)
  type!: InAppNotificationType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
