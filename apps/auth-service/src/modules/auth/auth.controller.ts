import { Controller, Post, Get, Patch, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '@webrana-cloud/common';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 201 Created - creates new user resource
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 req/60s per IP
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // 200 OK - action, not resource creation
  @Public()
  @Post('verify-email')
  @HttpCode(200)
  @SkipThrottle()
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  // 200 OK - action, not resource creation
  @Public()
  @Post('resend-verification')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 req/60s per email
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  // 200 OK - authentication action
  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 req/60s per IP
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.login(dto, ipAddress);
  }

  // 200 OK - token refresh action
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @SkipThrottle()
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  // 200 OK - logout action
  @Public()
  @Post('logout')
  @HttpCode(200)
  @SkipThrottle()
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  // 200 OK - logout action
  @Post('logout-all')
  @HttpCode(200)
  @SkipThrottle()
  async logoutAll(@CurrentUser('id') userId: string) {
    return this.authService.logoutAll(userId);
  }

  // 200 OK - action, not resource creation
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 req/60s per email
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 200 OK - password reset action
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @SkipThrottle()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // 200 OK - password change action
  @Post('change-password')
  @HttpCode(200)
  @SkipThrottle()
  async changePassword(@CurrentUser('id') userId: string, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(userId, dto);
  }

  @Get('me')
  @SkipThrottle()
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @SkipThrottle()
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: { full_name?: string; phone_number?: string; timezone?: string; language?: string }
  ) {
    const user = await this.authService['userService'].updateProfile(userId, {
      fullName: dto.full_name,
      phoneNumber: dto.phone_number,
      timezone: dto.timezone,
      language: dto.language,
    });

    return {
      data: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone_number: user.phoneNumber,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        language: user.language,
        updated_at: user.updatedAt.toISOString(),
      },
    };
  }
}
