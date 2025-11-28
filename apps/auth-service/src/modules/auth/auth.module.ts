import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtTokenService } from '../../common/services/jwt.service';
import { TokenService } from '../../common/services/token.service';
import { PasswordService } from '../../common/services/password.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('AUTH_JWT_SECRET'),
        signOptions: {
          issuer: configService.get<string>('AUTH_JWT_ISSUER', 'webrana-cloud'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtTokenService,
    TokenService,
    PasswordService,
    JwtAuthGuard,
    Reflector,
  ],
  exports: [AuthService, JwtTokenService],
})
export class AuthModule {}
