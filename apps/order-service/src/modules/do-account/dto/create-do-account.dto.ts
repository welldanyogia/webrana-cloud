import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsOptional,
  MaxLength,
  IsEmail,
} from 'class-validator';

/**
 * DTO for creating a new DigitalOcean account
 */
export class CreateDoAccountDto {
  @ApiProperty({
    example: 'Production DO Account',
    description: 'Display name for the account',
    maxLength: 100,
  })
  @IsString({ message: 'name harus berupa string' })
  @IsNotEmpty({ message: 'name wajib diisi' })
  @MaxLength(100, { message: 'name maksimal 100 karakter' })
  name: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email associated with the DO account',
    maxLength: 255,
  })
  @IsEmail({}, { message: 'email harus berupa email valid' })
  @IsNotEmpty({ message: 'email wajib diisi' })
  @MaxLength(255, { message: 'email maksimal 255 karakter' })
  email: string;

  @ApiProperty({
    example: 'dop_v1_xxxxxxxxxxxxxxxxxxxxx',
    description: 'DigitalOcean API access token (will be encrypted)',
  })
  @IsString({ message: 'accessToken harus berupa string' })
  @IsNotEmpty({ message: 'accessToken wajib diisi' })
  accessToken: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Set as primary account for new provisions',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrimary harus berupa boolean' })
  isPrimary?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the account is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive harus berupa boolean' })
  isActive?: boolean;
}
