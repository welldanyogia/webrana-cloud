import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  let service: PasswordService;

  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const defaults: Record<string, any> = {
      AUTH_PASSWORD_MIN_LENGTH: 8,
      AUTH_PASSWORD_REQUIRE_UPPERCASE: 'true',
      AUTH_PASSWORD_REQUIRE_LOWERCASE: 'true',
      AUTH_PASSWORD_REQUIRE_DIGIT: 'true',
      AUTH_PASSWORD_REQUIRE_SPECIAL: 'true',
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
    service = new PasswordService(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hash()', () => {
    it('should return a valid bcrypt hash', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should use cost factor of 12', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      // bcrypt hash format: $2a$12$... where 12 is the cost factor
      expect(hash).toMatch(/^\$2[ab]\$12\$/);
    });
  });

  describe('verify()', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await service.hash(password);

      const result = await service.verify(wrongPassword, hash);

      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hash(password);

      const result = await service.verify('', hash);

      expect(result).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = 'Test@#$%^&*()123!';
      const hash = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });
  });

  describe('validatePolicy()', () => {
    it('should return valid for password meeting all requirements', () => {
      const password = 'SecurePass123!';

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.missingRequirements).toHaveLength(0);
    });

    it('should fail for password shorter than minimum length', () => {
      const password = 'Aa1!'; // Only 4 characters

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('min_length');
    });

    it('should fail for password without uppercase', () => {
      const password = 'securepass123!';

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('uppercase');
    });

    it('should fail for password without lowercase', () => {
      const password = 'SECUREPASS123!';

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('lowercase');
    });

    it('should fail for password without digit', () => {
      const password = 'SecurePass!!!';

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('digit');
    });

    it('should fail for password without special character', () => {
      const password = 'SecurePass123';

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('special_char');
    });

    it('should return multiple failures for weak password', () => {
      const password = 'password'; // lowercase only, no uppercase, digit, or special

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('uppercase');
      expect(result.missingRequirements).toContain('digit');
      expect(result.missingRequirements).toContain('special_char');
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{};\'"\\|,.<>/?';
      
      for (const char of specialChars) {
        const password = `SecurePass1${char}`;
        const result = service.validatePolicy(password);
        
        expect(result.missingRequirements).not.toContain('special_char');
      }
    });

    it('should handle exactly minimum length password', () => {
      const password = 'Aa1!aaaa'; // Exactly 8 characters

      const result = service.validatePolicy(password);

      expect(result.isValid).toBe(true);
      expect(result.missingRequirements).not.toContain('min_length');
    });
  });

  describe('getPolicy()', () => {
    it('should return current policy configuration', () => {
      const policy = service.getPolicy();

      expect(policy).toEqual({
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigit: true,
        requireSpecial: true,
      });
    });

    it('should return a copy, not the original object', () => {
      const policy1 = service.getPolicy();
      const policy2 = service.getPolicy();

      expect(policy1).not.toBe(policy2);
      expect(policy1).toEqual(policy2);
    });
  });

  describe('with custom policy configuration', () => {
    it('should respect custom minimum length', () => {
      const customConfigService = createMockConfigService({
        AUTH_PASSWORD_MIN_LENGTH: 12,
      });
      const customService = new PasswordService(customConfigService as unknown as ConfigService);
      const password = 'Aa1!aaaa'; // 8 characters, less than 12

      const result = customService.validatePolicy(password);

      expect(result.isValid).toBe(false);
      expect(result.missingRequirements).toContain('min_length');
    });

    it('should allow disabling uppercase requirement', () => {
      const customConfigService = createMockConfigService({
        AUTH_PASSWORD_REQUIRE_UPPERCASE: 'false',
      });
      const customService = new PasswordService(customConfigService as unknown as ConfigService);
      const password = 'securepass123!'; // No uppercase

      const result = customService.validatePolicy(password);

      expect(result.isValid).toBe(true);
      expect(result.missingRequirements).not.toContain('uppercase');
    });
  });
});
