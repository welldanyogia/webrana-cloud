import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token harus berupa string' })
  @IsNotEmpty({ message: 'Refresh token wajib diisi' })
  refresh_token: string;
}
