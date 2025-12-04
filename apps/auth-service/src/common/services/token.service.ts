import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationTokenType } from '@webrana-cloud/common';

export interface GeneratedToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly emailVerificationExpiryMs: number;
  private readonly passwordResetExpiryMs: number;

  constructor(private readonly configService: ConfigService) {
    this.emailVerificationExpiryMs = this.parseExpiryToMs(
      this.configService.get<string>('AUTH_EMAIL_VERIFICATION_EXPIRY', '24h')
    );
    this.passwordResetExpiryMs = this.parseExpiryToMs(
      this.configService.get<string>('AUTH_PASSWORD_RESET_EXPIRY', '1h')
    );
  }

  generateVerificationToken(type: VerificationTokenType): GeneratedToken {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiryMs =
      type === VerificationTokenType.EMAIL_VERIFICATION
        ? this.emailVerificationExpiryMs
        : this.passwordResetExpiryMs;

    return {
      token,
      tokenHash,
      expiresAt: new Date(Date.now() + expiryMs),
    };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)(s|m|h|d)$/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // default 24 hours
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}
