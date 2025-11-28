import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserStatus, VerificationTokenType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { JwtTokenService, TokenUser } from '../../common/services/jwt.service';
import { TokenService } from '../../common/services/token.service';
import { PasswordService } from '../../common/services/password.service';
import {
  InvalidCredentialsException,
  AccountSuspendedException,
  AccountDeletedException,
  InvalidTokenException,
  TokenExpiredException,
  TokenUsedException,
  InvalidCurrentPasswordException,
  UserNotFoundException,
} from '../../common/exceptions/auth.exceptions';
import { UserRole as CommonUserRole, UserStatus as CommonUserStatus } from '@webrana-cloud/common';
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.userService.create({
      email: dto.email,
      password: dto.password,
      fullName: dto.full_name,
      phoneNumber: dto.phone_number,
      timezone: dto.timezone,
      language: dto.language,
    });

    const verificationToken = this.tokenService.generateVerificationToken(
      VerificationTokenType.email_verification as unknown as import('@webrana-cloud/common').VerificationTokenType
    );

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verificationToken.tokenHash,
        type: VerificationTokenType.email_verification,
        expiresAt: verificationToken.expiresAt,
      },
    });

    this.logger.log(`Verification token created for user: ${user.id}`);

    return {
      data: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        status: user.status,
        created_at: user.createdAt.toISOString(),
        verification_token: verificationToken.token,
      },
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new InvalidTokenException();
    }

    if (verificationToken.usedAt) {
      throw new TokenUsedException();
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }

    if (verificationToken.type !== VerificationTokenType.email_verification) {
      throw new InvalidTokenException();
    }

    await this.prisma.$transaction([
      this.prisma.verificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { status: UserStatus.active },
      }),
    ]);

    this.logger.log(`Email verified for user: ${verificationToken.userId}`);

    return {
      data: {
        message: 'Email berhasil diverifikasi',
        user_id: verificationToken.userId,
      },
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      return { data: { message: 'Jika email terdaftar, link verifikasi akan dikirim' } };
    }

    if (user.status !== UserStatus.pending_verification) {
      return { data: { message: 'Jika email terdaftar, link verifikasi akan dikirim' } };
    }

    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: VerificationTokenType.email_verification,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const verificationToken = this.tokenService.generateVerificationToken(
      VerificationTokenType.email_verification as unknown as import('@webrana-cloud/common').VerificationTokenType
    );

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: verificationToken.tokenHash,
        type: VerificationTokenType.email_verification,
        expiresAt: verificationToken.expiresAt,
      },
    });

    this.logger.log(`Verification token resent for user: ${user.id}`);

    return {
      data: {
        message: 'Jika email terdaftar, link verifikasi akan dikirim',
        verification_token: verificationToken.token,
      },
    };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.userService.verifyPassword(user, dto.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException();
    }

    if (user.status === UserStatus.suspended) {
      throw new AccountSuspendedException();
    }

    if (user.status === UserStatus.deleted) {
      throw new AccountDeletedException();
    }

    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      role: user.role as unknown as CommonUserRole,
      status: user.status as unknown as CommonUserStatus,
    };

    const tokens = this.jwtTokenService.generateTokenPair(tokenUser);

    const refreshTokenHash = this.tokenService.hashRefreshToken(tokens.refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo: dto.device_info,
        ipAddress: ipAddress,
        expiresAt: new Date(Date.now() + this.jwtTokenService.getRefreshExpiryMs()),
      },
    });

    await this.userService.updateLastLogin(user.id);

    this.logger.log(`User logged in: ${user.id}`);

    return {
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          status: user.status,
        },
        requires_verification: user.status === UserStatus.pending_verification,
      },
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = this.jwtTokenService.verifyRefreshToken(dto.refresh_token);
    if (!payload) {
      throw new InvalidTokenException();
    }

    const tokenHash = this.tokenService.hashRefreshToken(dto.refresh_token);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new InvalidTokenException();
    }

    if (storedToken.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }

    const user = storedToken.user;

    if (user.status === UserStatus.suspended) {
      throw new AccountSuspendedException();
    }

    if (user.status === UserStatus.deleted) {
      throw new AccountDeletedException();
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const tokenUser: TokenUser = {
      id: user.id,
      email: user.email,
      role: user.role as unknown as CommonUserRole,
      status: user.status as unknown as CommonUserStatus,
    };

    const tokens = this.jwtTokenService.generateTokenPair(tokenUser);

    const newRefreshTokenHash = this.tokenService.hashRefreshToken(tokens.refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        deviceInfo: storedToken.deviceInfo,
        ipAddress: storedToken.ipAddress,
        expiresAt: new Date(Date.now() + this.jwtTokenService.getRefreshExpiryMs()),
      },
    });

    this.logger.log(`Token refreshed for user: ${user.id}`);

    return {
      data: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
        expires_in: tokens.expiresIn,
      },
    };
  }

  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.tokenService.hashRefreshToken(dto.refresh_token);

    const result = await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    if (result.count > 0) {
      this.logger.log('User logged out');
    }

    return { data: { message: 'Logout berhasil' } };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`All sessions revoked for user: ${userId}`);

    return { data: { message: 'Semua sesi berhasil di-logout' } };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      return { data: { message: 'Jika email terdaftar, link reset password akan dikirim' } };
    }

    await this.prisma.verificationToken.updateMany({
      where: {
        userId: user.id,
        type: VerificationTokenType.password_reset,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    const resetToken = this.tokenService.generateVerificationToken(
      VerificationTokenType.password_reset as unknown as import('@webrana-cloud/common').VerificationTokenType
    );

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        tokenHash: resetToken.tokenHash,
        type: VerificationTokenType.password_reset,
        expiresAt: resetToken.expiresAt,
      },
    });

    this.logger.log(`Password reset token created for user: ${user.id}`);

    return {
      data: {
        message: 'Jika email terdaftar, link reset password akan dikirim',
        reset_token: resetToken.token,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.tokenService.hashToken(dto.token);

    const verificationToken = await this.prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new InvalidTokenException();
    }

    if (verificationToken.usedAt) {
      throw new TokenUsedException();
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new TokenExpiredException();
    }

    if (verificationToken.type !== VerificationTokenType.password_reset) {
      throw new InvalidTokenException();
    }

    await this.userService.updatePassword(verificationToken.userId, dto.new_password);

    await this.prisma.verificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: verificationToken.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Password reset for user: ${verificationToken.userId}`);

    return { data: { message: 'Password berhasil direset' } };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userService.findByIdOrThrow(userId);

    const isCurrentPasswordValid = await this.userService.verifyPassword(user, dto.current_password);
    if (!isCurrentPasswordValid) {
      throw new InvalidCurrentPasswordException();
    }

    await this.userService.updatePassword(userId, dto.new_password);

    // FR-37: Revoke all refresh tokens after password change
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Password changed for user: ${userId}`);

    return { data: { message: 'Password berhasil diubah' } };
  }

  async getProfile(userId: string) {
    const user = await this.userService.findByIdOrThrow(userId);

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
        last_login_at: user.lastLoginAt?.toISOString() || null,
        created_at: user.createdAt.toISOString(),
        updated_at: user.updatedAt.toISOString(),
      },
    };
  }
}
