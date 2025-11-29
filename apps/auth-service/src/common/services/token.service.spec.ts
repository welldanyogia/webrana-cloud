import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { VerificationTokenType } from '@webrana-cloud/common';
import { createHash } from 'crypto';

describe('TokenService', () => {
  let service: TokenService;

  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const defaults: Record<string, any> = {
      AUTH_EMAIL_VERIFICATION_EXPIRY: '24h',
      AUTH_PASSWORD_RESET_EXPIRY: '1h',
      ...overrides,
    };
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return defaults[key] !== undefined ? defaults[key] : defaultValue;
      }),
    };
  };

  beforeEach(() => {
    const mockConfigService = createMockConfigService();
    service = new TokenService(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVerificationToken()', () => {
    describe('for email_verification', () => {
      it('should generate token with correct structure', () => {
        const result = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);

        expect(result.token).toBeDefined();
        expect(result.tokenHash).toBeDefined();
        expect(result.expiresAt).toBeDefined();
        expect(result.expiresAt).toBeInstanceOf(Date);
      });

      it('should generate 64 character hex token (32 bytes)', () => {
        const result = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);

        expect(result.token).toHaveLength(64);
        expect(/^[a-f0-9]+$/.test(result.token)).toBe(true);
      });

      it('should generate unique tokens for each call', () => {
        const result1 = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
        const result2 = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);

        expect(result1.token).not.toBe(result2.token);
        expect(result1.tokenHash).not.toBe(result2.tokenHash);
      });

      it('should set expiry to 24 hours from now', () => {
        const before = Date.now();
        const result = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
        const after = Date.now();

        const expectedMinExpiry = before + 24 * 60 * 60 * 1000;
        const expectedMaxExpiry = after + 24 * 60 * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      });

      it('should hash token using SHA256', () => {
        const result = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
        const expectedHash = createHash('sha256').update(result.token).digest('hex');

        expect(result.tokenHash).toBe(expectedHash);
      });
    });

    describe('for password_reset', () => {
      it('should generate token with correct structure', () => {
        const result = service.generateVerificationToken(VerificationTokenType.PASSWORD_RESET);

        expect(result.token).toBeDefined();
        expect(result.tokenHash).toBeDefined();
        expect(result.expiresAt).toBeDefined();
      });

      it('should set expiry to 1 hour from now (different from email verification)', () => {
        const before = Date.now();
        const result = service.generateVerificationToken(VerificationTokenType.PASSWORD_RESET);
        const after = Date.now();

        const expectedMinExpiry = before + 1 * 60 * 60 * 1000; // 1 hour
        const expectedMaxExpiry = after + 1 * 60 * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      });

      it('should have shorter expiry than email verification', () => {
        const emailResult = service.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
        const resetResult = service.generateVerificationToken(VerificationTokenType.PASSWORD_RESET);

        // Password reset should expire before email verification
        expect(resetResult.expiresAt.getTime()).toBeLessThan(emailResult.expiresAt.getTime());
      });
    });

    describe('with custom expiry configuration', () => {
      it('should respect custom email verification expiry', () => {
        const customConfig = createMockConfigService({
          AUTH_EMAIL_VERIFICATION_EXPIRY: '48h',
        });
        const customService = new TokenService(customConfig as unknown as ConfigService);

        const before = Date.now();
        const result = customService.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
        const after = Date.now();

        const expectedMinExpiry = before + 48 * 60 * 60 * 1000;
        const expectedMaxExpiry = after + 48 * 60 * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      });

      it('should respect custom password reset expiry', () => {
        const customConfig = createMockConfigService({
          AUTH_PASSWORD_RESET_EXPIRY: '30m',
        });
        const customService = new TokenService(customConfig as unknown as ConfigService);

        const before = Date.now();
        const result = customService.generateVerificationToken(VerificationTokenType.PASSWORD_RESET);
        const after = Date.now();

        const expectedMinExpiry = before + 30 * 60 * 1000; // 30 minutes
        const expectedMaxExpiry = after + 30 * 60 * 1000;

        expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
        expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
      });
    });
  });

  describe('hashToken()', () => {
    it('should return SHA256 hash of input', () => {
      const input = 'test-token-string';
      const expectedHash = createHash('sha256').update(input).digest('hex');

      const result = service.hashToken(input);

      expect(result).toBe(expectedHash);
    });

    it('should return consistent hash for same input', () => {
      const input = 'consistent-token';

      const hash1 = service.hashToken(input);
      const hash2 = service.hashToken(input);

      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = service.hashToken('token-1');
      const hash2 = service.hashToken('token-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string', () => {
      const result = service.hashToken('any-input');

      expect(result).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(result)).toBe(true);
    });

    it('should handle empty string', () => {
      const expectedHash = createHash('sha256').update('').digest('hex');
      const result = service.hashToken('');

      expect(result).toBe(expectedHash);
    });

    it('should handle special characters', () => {
      const input = 'token-with-special-chars!@#$%^&*()';
      const expectedHash = createHash('sha256').update(input).digest('hex');

      const result = service.hashToken(input);

      expect(result).toBe(expectedHash);
    });

    it('should handle unicode characters', () => {
      const input = 'token-with-unicode-日本語';
      const expectedHash = createHash('sha256').update(input).digest('hex');

      const result = service.hashToken(input);

      expect(result).toBe(expectedHash);
    });
  });

  describe('hashRefreshToken()', () => {
    it('should return SHA256 hash (same as hashToken)', () => {
      const input = 'refresh-token-string';
      const expectedHash = createHash('sha256').update(input).digest('hex');

      const result = service.hashRefreshToken(input);

      expect(result).toBe(expectedHash);
    });

    it('should produce same result as hashToken for same input', () => {
      const input = 'same-input-token';

      const hashTokenResult = service.hashToken(input);
      const hashRefreshResult = service.hashRefreshToken(input);

      expect(hashTokenResult).toBe(hashRefreshResult);
    });

    it('should return consistent hash', () => {
      const input = 'consistent-refresh-token';

      const hash1 = service.hashRefreshToken(input);
      const hash2 = service.hashRefreshToken(input);

      expect(hash1).toBe(hash2);
    });
  });

  describe('expiry parsing', () => {
    it('should handle seconds format', () => {
      const customConfig = createMockConfigService({
        AUTH_EMAIL_VERIFICATION_EXPIRY: '3600s', // 1 hour in seconds
      });
      const customService = new TokenService(customConfig as unknown as ConfigService);

      const before = Date.now();
      const result = customService.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
      const after = Date.now();

      const expectedMinExpiry = before + 3600 * 1000;
      const expectedMaxExpiry = after + 3600 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should handle minutes format', () => {
      const customConfig = createMockConfigService({
        AUTH_PASSWORD_RESET_EXPIRY: '15m',
      });
      const customService = new TokenService(customConfig as unknown as ConfigService);

      const before = Date.now();
      const result = customService.generateVerificationToken(VerificationTokenType.PASSWORD_RESET);
      const after = Date.now();

      const expectedMinExpiry = before + 15 * 60 * 1000;
      const expectedMaxExpiry = after + 15 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should handle days format', () => {
      const customConfig = createMockConfigService({
        AUTH_EMAIL_VERIFICATION_EXPIRY: '7d',
      });
      const customService = new TokenService(customConfig as unknown as ConfigService);

      const before = Date.now();
      const result = customService.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
      const after = Date.now();

      const expectedMinExpiry = before + 7 * 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = after + 7 * 24 * 60 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it('should use default 24h for invalid format', () => {
      const customConfig = createMockConfigService({
        AUTH_EMAIL_VERIFICATION_EXPIRY: 'invalid',
      });
      const customService = new TokenService(customConfig as unknown as ConfigService);

      const before = Date.now();
      const result = customService.generateVerificationToken(VerificationTokenType.EMAIL_VERIFICATION);
      const after = Date.now();

      // Default is 24 hours
      const expectedMinExpiry = before + 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = after + 24 * 60 * 60 * 1000;

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });
});
