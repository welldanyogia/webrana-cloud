import { HttpStatus } from '@nestjs/common';

import { BillingException } from './billing.exceptions';

/**
 * Promo code not found
 */
export class PromoNotFoundException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_NOT_FOUND',
      `Kode promo "${code}" tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { code }
    );
  }
}

/**
 * Promo code is inactive
 */
export class PromoInactiveException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_INACTIVE',
      `Kode promo "${code}" tidak aktif`,
      HttpStatus.BAD_REQUEST,
      { code }
    );
  }
}

/**
 * Promo code has expired or not yet valid
 */
export class PromoExpiredException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_EXPIRED',
      `Kode promo "${code}" sudah tidak berlaku atau belum aktif`,
      HttpStatus.BAD_REQUEST,
      { code }
    );
  }
}

/**
 * Promo code has reached maximum usage limit
 */
export class PromoExhaustedException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_EXHAUSTED',
      `Kode promo "${code}" sudah mencapai batas penggunaan`,
      HttpStatus.BAD_REQUEST,
      { code }
    );
  }
}

/**
 * User has already used this promo code
 */
export class PromoAlreadyUsedException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_ALREADY_USED',
      `Anda sudah pernah menggunakan kode promo "${code}"`,
      HttpStatus.BAD_REQUEST,
      { code }
    );
  }
}

/**
 * Deposit amount does not meet minimum requirement
 */
export class PromoMinDepositException extends BillingException {
  constructor(code: string, minDeposit: number) {
    super(
      'PROMO_MIN_DEPOSIT_NOT_MET',
      `Minimal deposit untuk menggunakan kode "${code}" adalah Rp ${minDeposit.toLocaleString('id-ID')}`,
      HttpStatus.BAD_REQUEST,
      { code, minDeposit }
    );
  }
}

/**
 * Welcome bonus not available for user
 */
export class WelcomeBonusNotAvailableException extends BillingException {
  constructor() {
    super(
      'WELCOME_BONUS_NOT_AVAILABLE',
      'Welcome bonus tidak tersedia atau sudah diklaim',
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * Promo ID not found (for admin operations)
 */
export class PromoIdNotFoundException extends BillingException {
  constructor(id: string) {
    super(
      'PROMO_ID_NOT_FOUND',
      `Promo dengan ID ${id} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { id }
    );
  }
}

/**
 * Promo code already exists
 */
export class PromoCodeAlreadyExistsException extends BillingException {
  constructor(code: string) {
    super(
      'PROMO_CODE_ALREADY_EXISTS',
      `Kode promo "${code}" sudah digunakan`,
      HttpStatus.CONFLICT,
      { code }
    );
  }
}
