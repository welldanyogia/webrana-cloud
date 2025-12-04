import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  // Valid 64-character hex key (32 bytes)
  const validKey =
    'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_KEY') {
        return validKey;
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'dop_v1_secret_token_12345';
      const encrypted = service.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce encrypted string with correct format (iv:authTag:ciphertext)', () => {
      const plaintext = 'test_token';
      const encrypted = service.encrypt(plaintext);

      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);

      // IV should be 32 hex chars (16 bytes)
      expect(parts[0]).toHaveLength(32);
      // Auth tag should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32);
      // Ciphertext should be non-empty
      expect(parts[2].length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same plaintext (random IV)', () => {
      const plaintext = 'same_token';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const encrypted = service.encrypt('');
      expect(encrypted).toBeDefined();
      expect(encrypted.split(':')).toHaveLength(3);
    });

    it('should handle special characters', () => {
      const plaintext = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'token_日本語_한국어_中文';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt', () => {
    it('should decrypt ciphertext successfully', () => {
      const plaintext = 'dop_v1_secret_token_12345';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid format (not enough parts)', () => {
      expect(() => service.decrypt('invalid')).toThrow(
        'Invalid encrypted format'
      );
    });

    it('should throw error for invalid format (too many parts)', () => {
      expect(() => service.decrypt('a:b:c:d')).toThrow('Invalid encrypted format');
    });

    it('should throw error for invalid IV length', () => {
      const invalidIv = 'short';
      const validAuthTag = 'a'.repeat(32);
      const validCiphertext = 'abc123';

      expect(() =>
        service.decrypt(`${invalidIv}:${validAuthTag}:${validCiphertext}`)
      ).toThrow('Invalid IV length');
    });

    it('should throw error for invalid auth tag length', () => {
      const validIv = 'a'.repeat(32);
      const invalidAuthTag = 'short';
      const validCiphertext = 'abc123';

      expect(() =>
        service.decrypt(`${validIv}:${invalidAuthTag}:${validCiphertext}`)
      ).toThrow('Invalid auth tag length');
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'secret_token';
      const encrypted = service.encrypt(plaintext);
      const parts = encrypted.split(':');

      // Tamper with the ciphertext
      parts[2] = 'tampered' + parts[2];
      const tampered = parts.join(':');

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw error for empty ciphertext', () => {
      expect(() => service.decrypt('')).toThrow(
        'Invalid ciphertext: must be a non-empty string'
      );
    });

    it('should throw error for null ciphertext', () => {
      expect(() => service.decrypt(null as unknown as string)).toThrow(
        'Invalid ciphertext: must be a non-empty string'
      );
    });
  });

  describe('isEncrypted', () => {
    it('should return true for properly encrypted string', () => {
      const encrypted = service.encrypt('test');
      expect(service.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext', () => {
      expect(service.isEncrypted('plain_token')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isEncrypted('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(service.isEncrypted(null as unknown as string)).toBe(false);
      expect(service.isEncrypted(undefined as unknown as string)).toBe(false);
    });

    it('should return false for string with wrong number of parts', () => {
      expect(service.isEncrypted('a:b')).toBe(false);
      expect(service.isEncrypted('a:b:c:d')).toBe(false);
    });

    it('should return false for non-hex characters', () => {
      const invalidHex = 'zzzz'.repeat(8);
      const validHex = 'a'.repeat(32);
      expect(service.isEncrypted(`${invalidHex}:${validHex}:abc`)).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should throw error for invalid key length', async () => {
      const invalidConfigService = {
        get: jest.fn(() => 'short_key'),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            EncryptionService,
            { provide: ConfigService, useValue: invalidConfigService },
          ],
        }).compile()
      ).rejects.toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });

    it('should warn but not throw for missing key', async () => {
      const noKeyConfigService = {
        get: jest.fn(() => undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EncryptionService,
          { provide: ConfigService, useValue: noKeyConfigService },
        ],
      }).compile();

      const serviceWithNoKey = module.get<EncryptionService>(EncryptionService);

      // Encryption should fail at runtime
      expect(() => serviceWithNoKey.encrypt('test')).toThrow(
        'ENCRYPTION_KEY is not configured'
      );
    });
  });

  describe('roundtrip encryption', () => {
    it('should correctly encrypt and decrypt long tokens', () => {
      const longToken =
        'dop_v1_' +
        'x'.repeat(100) +
        '_' +
        Math.random().toString(36).substring(2);
      const encrypted = service.encrypt(longToken);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(longToken);
    });

    it('should correctly encrypt and decrypt multiple times', () => {
      const tokens = [
        'token1',
        'token2_with_special_chars_!@#',
        'token3_very_long_' + 'x'.repeat(500),
      ];

      for (const token of tokens) {
        const encrypted = service.encrypt(token);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(token);
      }
    });
  });
});
