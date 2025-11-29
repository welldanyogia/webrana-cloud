import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1...', description: 'Email verification token from email' })
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;
}
