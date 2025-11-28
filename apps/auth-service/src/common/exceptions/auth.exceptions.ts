import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

export class InvalidCredentialsException extends AuthException {
  constructor() {
    super('INVALID_CREDENTIALS', 'Email atau password salah', HttpStatus.UNAUTHORIZED);
  }
}

export class EmailExistsException extends AuthException {
  constructor() {
    super('EMAIL_EXISTS', 'Email sudah terdaftar', HttpStatus.CONFLICT);
  }
}

export class AccountSuspendedException extends AuthException {
  constructor() {
    super(
      'ACCOUNT_SUSPENDED',
      'Akun Anda telah disuspend. Hubungi support untuk informasi lebih lanjut.',
      HttpStatus.FORBIDDEN
    );
  }
}

export class AccountDeletedException extends AuthException {
  constructor() {
    super('ACCOUNT_DELETED', 'Akun tidak ditemukan', HttpStatus.FORBIDDEN);
  }
}

export class InvalidTokenException extends AuthException {
  constructor() {
    super('INVALID_TOKEN', 'Token tidak valid atau sudah expired', HttpStatus.BAD_REQUEST);
  }
}

export class TokenExpiredException extends AuthException {
  constructor() {
    super('TOKEN_EXPIRED', 'Token sudah expired', HttpStatus.BAD_REQUEST);
  }
}

export class TokenUsedException extends AuthException {
  constructor() {
    super('TOKEN_USED', 'Token sudah digunakan', HttpStatus.BAD_REQUEST);
  }
}

export class InvalidCurrentPasswordException extends AuthException {
  constructor() {
    super('INVALID_CURRENT_PASSWORD', 'Password saat ini tidak valid', HttpStatus.BAD_REQUEST);
  }
}

export class PasswordValidationException extends AuthException {
  constructor(requirements: string[]) {
    super('VALIDATION_ERROR', 'Password tidak memenuhi kriteria', HttpStatus.BAD_REQUEST, {
      field: 'password',
      requirements,
    });
  }
}

export class ValidationException extends AuthException {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, { field });
  }
}

export class ForbiddenException extends AuthException {
  constructor(message = 'Anda tidak memiliki akses untuk melakukan aksi ini') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class UserNotFoundException extends AuthException {
  constructor() {
    super('USER_NOT_FOUND', 'User tidak ditemukan', HttpStatus.NOT_FOUND);
  }
}

export class RateLimitExceededException extends AuthException {
  constructor() {
    super('RATE_LIMIT_EXCEEDED', 'Terlalu banyak permintaan. Silakan coba lagi nanti.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
