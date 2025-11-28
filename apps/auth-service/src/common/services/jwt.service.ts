import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { UserRole, UserStatus, AccessTokenPayload, RefreshTokenPayload, TokenPair } from '@webrana-cloud/common';

export interface TokenUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

@Injectable()
export class JwtTokenService {
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly issuer: string;

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService
  ) {
    this.accessExpiry = this.configService.get<string>('AUTH_JWT_ACCESS_EXPIRY', '15m');
    this.refreshExpiry = this.configService.get<string>('AUTH_JWT_REFRESH_EXPIRY', '7d');
    this.issuer = this.configService.get<string>('AUTH_JWT_ISSUER', 'webrana-cloud');
  }

  generateAccessToken(user: TokenUser): string {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      type: 'access',
      iss: this.issuer,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.accessExpiry,
    });
  }

  generateRefreshToken(userId: string): { token: string; tokenId: string } {
    const tokenId = uuidv4();
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      tokenId,
      type: 'refresh',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.refreshExpiry,
    });

    return { token, tokenId };
  }

  generateTokenPair(user: TokenUser): TokenPair & { refreshTokenId: string } {
    const accessToken = this.generateAccessToken(user);
    const { token: refreshToken, tokenId: refreshTokenId } = this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      refreshTokenId,
      expiresIn: this.parseExpiryToSeconds(this.accessExpiry),
      tokenType: 'Bearer',
    };
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token);
      if (payload.type !== 'access') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token);
      if (payload.type !== 'refresh') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }

  decodeToken<T>(token: string): T | null {
    try {
      return this.jwtService.decode(token) as T;
    } catch {
      return null;
    }
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return 900; // default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }

  getRefreshExpiryMs(): number {
    return this.parseExpiryToSeconds(this.refreshExpiry) * 1000;
  }
}
