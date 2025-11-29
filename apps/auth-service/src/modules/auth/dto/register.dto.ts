import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @MaxLength(255, { message: 'Email maksimal 255 karakter' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Password (min 8 characters)', minLength: 8 })
  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString({ message: 'Nama lengkap harus berupa string' })
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @MaxLength(255, { message: 'Nama lengkap maksimal 255 karakter' })
  full_name: string;

  @ApiPropertyOptional({ example: '+6281234567890', description: 'Phone number' })
  @IsOptional()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @MaxLength(50, { message: 'Nomor telepon maksimal 50 karakter' })
  phone_number?: string;

  @ApiPropertyOptional({ example: 'Asia/Jakarta', description: 'User timezone' })
  @IsOptional()
  @IsString({ message: 'Timezone harus berupa string' })
  @MaxLength(100, { message: 'Timezone maksimal 100 karakter' })
  timezone?: string;

  @ApiPropertyOptional({ example: 'id', description: 'Preferred language code' })
  @IsOptional()
  @IsString({ message: 'Language harus berupa string' })
  @MaxLength(10, { message: 'Language maksimal 10 karakter' })
  language?: string;
}
