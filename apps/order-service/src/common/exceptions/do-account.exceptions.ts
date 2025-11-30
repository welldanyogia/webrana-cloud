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
    super(
      {
        error: {
          code,
          message,
          details,
        },
      },
      status
    );
  }
}

/**
 * Thrown when no active DO accounts are configured in the system
 */
export class NoAvailableDoAccountException extends DoAccountException {
  constructor() {
    super(
      'NO_AVAILABLE_DO_ACCOUNT',
      'No active DigitalOcean accounts configured',
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }
}

/**
 * Thrown when all configured DO accounts have reached their droplet limit
 */
export class AllDoAccountsFullException extends DoAccountException {
  constructor(details?: { totalAccounts?: number; totalCapacity?: number }) {
    super(
      'ALL_DO_ACCOUNTS_FULL',
      'All DigitalOcean accounts have reached their droplet limit',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

/**
 * Thrown when a specific DO account is not found
 */
export class DoAccountNotFoundException extends DoAccountException {
  constructor(id: string) {
    super(
      'DO_ACCOUNT_NOT_FOUND',
      `DigitalOcean account with ID ${id} not found`,
      HttpStatus.NOT_FOUND,
      { accountId: id }
    );
  }
}

/**
 * Thrown when a DO access token is invalid or expired
 */
export class InvalidDoTokenException extends DoAccountException {
  constructor(accountId?: string) {
    super(
      'INVALID_DO_TOKEN',
      'Invalid DigitalOcean access token',
      HttpStatus.BAD_REQUEST,
      accountId ? { accountId } : undefined
    );
  }
}

/**
 * Thrown when DO API rate limit is exceeded
 */
export class DoApiRateLimitedException extends DoAccountException {
  constructor(accountId?: string, retryAfter?: number) {
    super(
      'DO_API_RATE_LIMITED',
      'DigitalOcean API rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
      { accountId, retryAfter }
    );
  }
}

/**
 * Thrown when DO account health check fails
 */
export class DoAccountHealthCheckFailedException extends DoAccountException {
  constructor(accountId: string, reason?: string) {
    super(
      'DO_ACCOUNT_HEALTH_CHECK_FAILED',
      `Health check failed for DigitalOcean account ${accountId}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { accountId, reason }
    );
  }
}
