import { HttpException, HttpStatus } from '@nestjs/common';

export class CatalogException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

export class PlanNotFoundException extends CatalogException {
  constructor() {
    super('PLAN_NOT_FOUND', 'Plan tidak ditemukan', HttpStatus.NOT_FOUND);
  }
}

export class ImageNotFoundException extends CatalogException {
  constructor() {
    super('IMAGE_NOT_FOUND', 'Image tidak ditemukan', HttpStatus.NOT_FOUND);
  }
}

export class CouponNotFoundException extends CatalogException {
  constructor() {
    super('NOT_FOUND', 'Kupon tidak ditemukan', HttpStatus.NOT_FOUND);
  }
}

export class CouponExpiredException extends CatalogException {
  constructor() {
    super('EXPIRED', 'Kupon sudah expired', HttpStatus.BAD_REQUEST);
  }
}

export class CouponNotStartedException extends CatalogException {
  constructor() {
    super('BEFORE_START', 'Kupon belum dapat digunakan', HttpStatus.BAD_REQUEST);
  }
}

export class CouponInactiveException extends CatalogException {
  constructor() {
    super('INACTIVE', 'Kupon tidak aktif', HttpStatus.BAD_REQUEST);
  }
}

export class CouponLimitGlobalReachedException extends CatalogException {
  constructor() {
    super('LIMIT_GLOBAL_REACHED', 'Batas penggunaan kupon sudah tercapai', HttpStatus.BAD_REQUEST);
  }
}

export class CouponLimitPerUserReachedException extends CatalogException {
  constructor() {
    super('LIMIT_PER_USER_REACHED', 'Anda sudah mencapai batas penggunaan kupon ini', HttpStatus.BAD_REQUEST);
  }
}

export class CouponPlanNotAllowedException extends CatalogException {
  constructor() {
    super('PLAN_NOT_ALLOWED', 'Kupon tidak berlaku untuk plan ini', HttpStatus.BAD_REQUEST);
  }
}

export class CouponUserNotAllowedException extends CatalogException {
  constructor() {
    super('USER_NOT_ALLOWED', 'Kupon tidak berlaku untuk pengguna ini', HttpStatus.BAD_REQUEST);
  }
}

export class CouponMinAmountNotMetException extends CatalogException {
  constructor(minAmount: number) {
    super(
      'MIN_AMOUNT_NOT_MET',
      `Minimum order untuk kupon ini adalah ${minAmount}`,
      HttpStatus.BAD_REQUEST,
      { minAmount }
    );
  }
}

export class DuplicateEntryException extends CatalogException {
  constructor(entity: string) {
    super('DUPLICATE_ENTRY', `${entity} sudah ada`, HttpStatus.CONFLICT);
  }
}

export class ValidationException extends CatalogException {
  constructor(field: string, message: string) {
    super('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST, { field });
  }
}

export class BillingPeriodNotAllowedException extends CatalogException {
  constructor(planId: string, period: string) {
    super(
      'BILLING_PERIOD_NOT_ALLOWED',
      `Billing period ${period} tidak tersedia untuk plan ini`,
      HttpStatus.BAD_REQUEST,
      { planId, period }
    );
  }
}

export class PriceNotSetException extends CatalogException {
  constructor(period: string) {
    super(
      'PRICE_NOT_SET',
      `Harga untuk period ${period} belum diatur`,
      HttpStatus.BAD_REQUEST,
      { period }
    );
  }
}
