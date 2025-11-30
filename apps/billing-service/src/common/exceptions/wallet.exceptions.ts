import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for wallet-related errors
 */
export class WalletException extends HttpException {
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
 * Wallet not found for user
 */
export class WalletNotFoundException extends WalletException {
  constructor(userId: string) {
    super(
      'WALLET_NOT_FOUND',
      `Wallet untuk user ${userId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { userId }
    );
  }
}

/**
 * Insufficient balance for operation
 */
export class InsufficientBalanceException extends WalletException {
  constructor(currentBalance: number, requiredAmount: number) {
    super(
      'INSUFFICIENT_BALANCE',
      `Saldo tidak mencukupi. Saldo saat ini: Rp ${currentBalance.toLocaleString('id-ID')}, dibutuhkan: Rp ${requiredAmount.toLocaleString('id-ID')}`,
      HttpStatus.BAD_REQUEST,
      { currentBalance, requiredAmount, deficit: requiredAmount - currentBalance }
    );
  }
}

/**
 * Deposit not found
 */
export class DepositNotFoundException extends WalletException {
  constructor(depositId: string) {
    super(
      'DEPOSIT_NOT_FOUND',
      `Deposit dengan ID ${depositId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { depositId }
    );
  }
}

/**
 * Deposit already processed (idempotency check)
 */
export class DepositAlreadyProcessedException extends WalletException {
  constructor(depositId: string) {
    super(
      'DEPOSIT_ALREADY_PROCESSED',
      `Deposit ${depositId} sudah diproses sebelumnya`,
      HttpStatus.CONFLICT,
      { depositId }
    );
  }
}

/**
 * Deposit expired before payment
 */
export class DepositExpiredException extends WalletException {
  constructor(depositId: string) {
    super(
      'DEPOSIT_EXPIRED',
      `Deposit ${depositId} sudah expired`,
      HttpStatus.BAD_REQUEST,
      { depositId }
    );
  }
}

/**
 * Deposit access denied
 */
export class DepositAccessDeniedException extends WalletException {
  constructor(depositId: string) {
    super(
      'DEPOSIT_ACCESS_DENIED',
      'Anda tidak memiliki akses ke deposit ini',
      HttpStatus.FORBIDDEN,
      { depositId }
    );
  }
}

/**
 * Invalid deposit amount
 */
export class InvalidDepositAmountException extends WalletException {
  constructor(amount: number, minAmount: number) {
    super(
      'INVALID_DEPOSIT_AMOUNT',
      `Jumlah deposit minimum adalah Rp ${minAmount.toLocaleString('id-ID')}`,
      HttpStatus.BAD_REQUEST,
      { amount, minAmount }
    );
  }
}

/**
 * Transaction conflict (optimistic locking failure)
 */
export class WalletTransactionConflictException extends WalletException {
  constructor(userId: string) {
    super(
      'WALLET_TRANSACTION_CONFLICT',
      'Terjadi konflik pada transaksi wallet. Silakan coba lagi.',
      HttpStatus.CONFLICT,
      { userId }
    );
  }
}
