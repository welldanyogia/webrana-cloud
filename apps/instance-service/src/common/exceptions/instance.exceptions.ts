import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class InstanceException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

export class InstanceNotFoundException extends InstanceException {
  constructor(instanceId?: string) {
    super(
      'INSTANCE_NOT_FOUND',
      'Instance dengan ID tersebut tidak ditemukan',
      HttpStatus.NOT_FOUND,
      instanceId ? { instanceId } : undefined
    );
  }
}

export class InstanceAccessDeniedException extends InstanceException {
  constructor(instanceId?: string) {
    super(
      'INSTANCE_ACCESS_DENIED',
      'User tidak memiliki akses ke instance ini',
      HttpStatus.FORBIDDEN,
      instanceId ? { instanceId } : undefined
    );
  }
}

export class ActionNotAllowedException extends InstanceException {
  constructor(action?: string, reason?: string) {
    super(
      'ACTION_NOT_ALLOWED',
      reason || 'Aksi tidak diperbolehkan untuk instance ini',
      HttpStatus.BAD_REQUEST,
      { action, reason }
    );
  }
}

export class DigitalOceanApiException extends InstanceException {
  constructor(details?: Record<string, unknown>) {
    super(
      'DIGITALOCEAN_API_ERROR',
      'Gagal berkomunikasi dengan DigitalOcean API',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

export class OrderServiceUnavailableException extends InstanceException {
  constructor(details?: Record<string, unknown>) {
    super(
      'ORDER_SERVICE_UNAVAILABLE',
      'Tidak dapat menghubungi order-service',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

export class ActionNotFoundException extends InstanceException {
  constructor(actionId?: string | number) {
    super(
      'ACTION_NOT_FOUND',
      'Action dengan ID tersebut tidak ditemukan',
      HttpStatus.NOT_FOUND,
      actionId ? { actionId } : undefined
    );
  }
}

export class RateLimitExceededException extends InstanceException {
  constructor(instanceId?: string, waitSeconds?: number) {
    super(
      'RATE_LIMIT_EXCEEDED',
      `Terlalu banyak request. Tunggu ${waitSeconds || 60} detik sebelum mencoba lagi.`,
      HttpStatus.TOO_MANY_REQUESTS,
      { instanceId, waitSeconds }
    );
  }
}
