import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PasswordValidationResult, PasswordPolicyConfig } from '@webrana-cloud/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  private readonly policy: PasswordPolicyConfig;
  private readonly SALT_ROUNDS = 12;

  constructor(private readonly configService: ConfigService) {
    this.policy = {
      minLength: this.configService.get<number>('AUTH_PASSWORD_MIN_LENGTH', 8),
      requireUppercase: this.configService.get<string>('AUTH_PASSWORD_REQUIRE_UPPERCASE', 'true') === 'true',
      requireLowercase: this.configService.get<string>('AUTH_PASSWORD_REQUIRE_LOWERCASE', 'true') === 'true',
      requireDigit: this.configService.get<string>('AUTH_PASSWORD_REQUIRE_DIGIT', 'true') === 'true',
      requireSpecial: this.configService.get<string>('AUTH_PASSWORD_REQUIRE_SPECIAL', 'true') === 'true',
    };
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePolicy(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const missingRequirements: string[] = [];

    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
      missingRequirements.push('min_length');
    }

    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
      missingRequirements.push('uppercase');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
      missingRequirements.push('lowercase');
    }

    if (this.policy.requireDigit && !/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
      missingRequirements.push('digit');
    }

    if (this.policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
      missingRequirements.push('special_char');
    }

    return {
      isValid: errors.length === 0,
      errors,
      missingRequirements,
    };
  }

  getPolicy(): PasswordPolicyConfig {
    return { ...this.policy };
  }
}
