import {
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsEmail,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a DigitalOcean account
 */
export class UpdateDoAccountDto {
  @ApiPropertyOptional({
    example: 'Production DO Account',
    description: 'Display name for the account',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'name harus berupa string' })
  @MaxLength(100, { message: 'name maksimal 100 karakter' })
  name?: string;

  @ApiPropertyOptional({
    example: 'admin@example.com',
    description: 'Email associated with the DO account',
    maxLength: 255,
  })
  @IsOptional()
  @IsEmail({}, { message: 'email harus berupa email valid' })
  @MaxLength(255, { message: 'email maksimal 255 karakter' })
  email?: string;

  @ApiPropertyOptional({
    example: 'dop_v1_xxxxxxxxxxxxxxxxxxxxx',
    description: 'DigitalOcean API access token (will be encrypted)',
  })
  @IsOptional()
  @IsString({ message: 'accessToken harus berupa string' })
  accessToken?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as primary account for new provisions',
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrimary harus berupa boolean' })
  isPrimary?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the account is active',
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}
