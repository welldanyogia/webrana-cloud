import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'Token harus berupa string' })
  @IsNotEmpty({ message: 'Token wajib diisi' })
  token: string;
}
