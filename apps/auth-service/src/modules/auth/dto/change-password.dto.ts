import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentPass123!', description: 'Current password' })
  @IsString({ message: 'Password saat ini harus berupa string' })
  @IsNotEmpty({ message: 'Password saat ini wajib diisi' })
  current_password: string;

  @ApiProperty({ example: 'NewSecurePass123!', description: 'New password (min 8 characters)', minLength: 8 })
  @IsString({ message: 'Password baru harus berupa string' })
  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  new_password: string;
}
