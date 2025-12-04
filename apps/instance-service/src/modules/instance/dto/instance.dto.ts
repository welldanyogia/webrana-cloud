import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * Instance Action Types
 */
export enum InstanceActionType {
  REBOOT = 'reboot',
  POWER_OFF = 'power_off',
  POWER_ON = 'power_on',
  RESET_PASSWORD = 'reset_password',
}

/**
 * DTO for triggering an action on an instance
 */
export class TriggerActionDto {
  @ApiProperty({ enum: InstanceActionType, example: 'reboot', description: 'Action type: reboot, power_off, power_on, reset_password' })
  @IsEnum(InstanceActionType, {
    message: 'type harus salah satu dari: reboot, power_off, power_on, reset_password',
  })
  type: InstanceActionType;
}

/**
 * Pagination query DTO
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page (max: 100)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Instance plan details
 */
export interface InstancePlanDto {
  name: string;
  cpu: number;
  ram: number;
  ssd: number;
}

/**
 * Instance image details
 */
export interface InstanceImageDto {
  name: string;
  distribution: string;
}

/**
 * Instance response DTO
 */
export interface InstanceResponseDto {
  id: string;
  orderId: string;
  hostname: string;
  ipAddress: string | null;
  status: 'active' | 'off' | 'new' | 'archive';
  plan: InstancePlanDto;
  image: InstanceImageDto;
  region: string;
  createdAt: string;
}

/**
 * Instance detail response DTO (includes more info)
 */
export interface InstanceDetailResponseDto extends InstanceResponseDto {
  ipAddressPrivate: string | null;
  vcpus: number;
  memory: number;
  disk: number;
  doDropletId: string;
}

/**
 * Action response DTO
 */
export interface ActionResponseDto {
  id: number;
  type: string;
  status: 'in-progress' | 'completed' | 'errored';
  startedAt: string;
  completedAt: string | null;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Console access response DTO
 */
export interface ConsoleAccessResponseDto {
  /** DigitalOcean web console URL */
  consoleUrl: string;
  /** Console access type */
  type: 'web_console';
  /** Expiration time for the console session recommendation */
  expiresAt: string;
  /** Additional instructions for the user */
  instructions: string;
}
