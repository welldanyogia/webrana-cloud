import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  @MaxLength(255, { message: 'Email maksimal 255 karakter' })
  email: string;

  @IsString({ message: 'Password harus berupa string' })
  @IsNotEmpty({ message: 'Password wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  password: string;

  @IsString({ message: 'Nama lengkap harus berupa string' })
  @IsNotEmpty({ message: 'Nama lengkap wajib diisi' })
  @MaxLength(255, { message: 'Nama lengkap maksimal 255 karakter' })
  full_name: string;

  @IsOptional()
  @IsString({ message: 'Nomor telepon harus berupa string' })
  @MaxLength(50, { message: 'Nomor telepon maksimal 50 karakter' })
  phone_number?: string;

  @IsOptional()
  @IsString({ message: 'Timezone harus berupa string' })
  @MaxLength(100, { message: 'Timezone maksimal 100 karakter' })
  timezone?: string;

  @IsOptional()
  @IsString({ message: 'Language harus berupa string' })
  @MaxLength(10, { message: 'Language maksimal 10 karakter' })
  language?: string;
}
