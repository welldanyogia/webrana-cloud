import { Type } from 'class-transformer';
import { IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';

/**
 * Query parameters for listing user notifications
 */
export class ListNotificationsQueryDto {
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
  @IsBoolean()
  @Type(() => Boolean)
  isRead?: boolean;
}
