import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for DO Account related errors
 */
export abstract class DoAccountException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

/**
 * Thrown when no available DO accounts can be found for provisioning
 */
export class NoAvailableAccountException extends DoAccountException {
  constructor() {
    super(
      'NO_AVAILABLE_ACCOUNT',
      'Tidak ada akun DigitalOcean yang tersedia untuk provisioning',
      HttpStatus.SERVICE_UNAVAILABLE,
      { reason: 'All accounts are either full, inactive, or unhealthy' }
    );
  }
}

/**
 * Thrown when all DO accounts have reached their droplet limit
 */
export class AllAccountsFullException extends DoAccountException {
  constructor() {
    super(
      'ALL_ACCOUNTS_FULL',
      'Semua akun DigitalOcean sudah mencapai batas droplet',
      HttpStatus.SERVICE_UNAVAILABLE,
      { reason: 'All accounts have reached droplet limit' }
    );
  }
}

/**
 * Thrown when a specific DO account is not found
 */
export class DoAccountNotFoundException extends DoAccountException {
  constructor(accountId?: string) {
    super(
      'DO_ACCOUNT_NOT_FOUND',
      'Akun DigitalOcean tidak ditemukan',
      HttpStatus.NOT_FOUND,
      accountId ? { accountId } : undefined
    );
  }
}

/**
 * Thrown when DO account token decryption fails
 */
export class TokenDecryptionException extends DoAccountException {
  constructor(accountId?: string) {
    super(
      'TOKEN_DECRYPTION_FAILED',
      'Gagal mendekripsi token akun DigitalOcean',
      HttpStatus.INTERNAL_SERVER_ERROR,
      accountId ? { accountId } : undefined
    );
  }
}

/**
 * Thrown when DO API call fails
 */
export class DoApiException extends DoAccountException {
  constructor(details?: Record<string, unknown>) {
    super(
      'DO_API_ERROR',
      'Gagal menghubungi API DigitalOcean',
      HttpStatus.BAD_GATEWAY,
      details
    );
  }
}
