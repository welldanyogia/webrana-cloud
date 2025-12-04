import * as crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Encryption Service for secure data storage
 *
 * Uses AES-256-GCM for authenticated encryption of sensitive data.
 * All encrypted values include IV and auth tag for verification.
 *
 * Environment variables required:
 * - ENCRYPTION_KEY: 64 hex characters (32 bytes)
 *
 * Generate key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');

    if (!keyHex) {
      this.logger.warn(
        'ENCRYPTION_KEY is not configured. Encryption will fail at runtime.'
      );
      this.key = Buffer.alloc(32); // Placeholder, will fail on use
    } else if (keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_KEY must be 64 hex characters (32 bytes). ' +
          `Got ${keyHex.length} characters. ` +
          'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    } else {
      this.key = Buffer.from(keyHex, 'hex');
      this.logger.log('Encryption service initialized successfully');
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   *
   * @param plaintext The text to encrypt
   * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
   * @throws Error if encryption fails or key is not configured
   */
  encrypt(plaintext: string): string {
    if (!this.key || this.key.every((b) => b === 0)) {
      throw new Error(
        'ENCRYPTION_KEY is not configured. Cannot encrypt sensitive data.'
      );
    }

    try {
      // Generate random IV (16 bytes for GCM)
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (16 bytes)
      const authTag = cipher.getAuthTag();

      // Return combined: iv:authTag:ciphertext
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM
   *
   * @param ciphertext Encrypted string in format: iv:authTag:ciphertext
   * @returns Decrypted plaintext
   * @throws Error if decryption fails, format is invalid, or auth tag verification fails
   */
  decrypt(ciphertext: string): string {
    if (!this.key || this.key.every((b) => b === 0)) {
      throw new Error(
        'ENCRYPTION_KEY is not configured. Cannot decrypt sensitive data.'
      );
    }

    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new Error('Invalid ciphertext: must be a non-empty string');
    }

    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error(
        'Invalid encrypted format. Expected format: iv:authTag:ciphertext'
      );
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // Validate hex format and lengths
    if (ivHex.length !== 32) {
      throw new Error('Invalid IV length');
    }
    if (authTagHex.length !== 32) {
      throw new Error('Invalid auth tag length');
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', { error: (error as Error).message });

      // Check if it's an auth tag verification failure
      if ((error as Error).message?.includes('Unsupported state')) {
        throw new Error('Decryption failed: authentication tag verification failed');
      }

      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if a string appears to be encrypted (has the correct format)
   *
   * @param value String to check
   * @returns true if the string has the encrypted format
   */
  isEncrypted(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }

    const parts = value.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [ivHex, authTagHex, encrypted] = parts;

    // Check if all parts are valid hex strings with expected lengths
    return (
      ivHex.length === 32 &&
      authTagHex.length === 32 &&
      encrypted.length > 0 &&
      /^[0-9a-fA-F]+$/.test(ivHex) &&
      /^[0-9a-fA-F]+$/.test(authTagHex) &&
      /^[0-9a-fA-F]+$/.test(encrypted)
    );
  }
}
