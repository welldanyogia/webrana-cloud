import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;

  @IsString({ message: 'Password baru harus berupa string' })
  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(128, { message: 'Password maksimal 128 karakter' })
  new_password: string;
}
