import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ThrottleEmailGuard } from '../../common/guards/throttle-email.guard';
import { ThrottleIpGuard } from '../../common/guards/throttle-ip.guard';
import { JwtTokenService } from '../../common/services/jwt.service';
import { PasswordService } from '../../common/services/password.service';
import { TokenService } from '../../common/services/token.service';
import { UserModule } from '../user/user.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';


@Module({
  imports: [
    UserModule,
    ThrottlerModule,
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
    ThrottleIpGuard,
    ThrottleEmailGuard,
    Reflector,
  ],
  exports: [AuthService, JwtTokenService],
})
export class AuthModule {}
