import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class OrderException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, status);
  }
}

export class OrderNotFoundException extends OrderException {
  constructor(orderId?: string) {
    super(
      'ORDER_NOT_FOUND',
      'Order dengan ID tersebut tidak ditemukan',
      HttpStatus.NOT_FOUND,
      orderId ? { orderId } : undefined
    );
  }
}

export class OrderAccessDeniedException extends OrderException {
  constructor(orderId?: string) {
    super(
      'ORDER_ACCESS_DENIED',
      'User tidak memiliki akses ke order ini',
      HttpStatus.FORBIDDEN,
      orderId ? { orderId } : undefined
    );
  }
}

export class InvalidPlanException extends OrderException {
  constructor(planId?: string, reason?: string) {
    super(
      'INVALID_PLAN',
      'Plan ID tidak valid atau tidak aktif',
      HttpStatus.BAD_REQUEST,
      { planId, reason }
    );
  }
}

export class InvalidImageException extends OrderException {
  constructor(imageId?: string, reason?: string) {
    super(
      'INVALID_IMAGE',
      'Image ID tidak valid atau tidak tersedia untuk plan',
      HttpStatus.BAD_REQUEST,
      { imageId, reason }
    );
  }
}

export class InvalidCouponException extends OrderException {
  constructor(couponCode?: string, reason?: string) {
    super(
      'INVALID_COUPON',
      'Coupon tidak valid',
      HttpStatus.BAD_REQUEST,
      { couponCode, reason }
    );
  }
}

export class InvalidDurationException extends OrderException {
  constructor(duration?: string) {
    super(
      'INVALID_DURATION',
      'Duration tidak valid untuk plan ini',
      HttpStatus.BAD_REQUEST,
      { duration }
    );
  }
}

export class PaymentStatusConflictException extends OrderException {
  constructor(currentStatus?: string, requestedStatus?: string) {
    super(
      'PAYMENT_STATUS_CONFLICT',
      'Order tidak dalam status yang valid untuk transisi payment',
      HttpStatus.CONFLICT,
      { currentStatus, requestedStatus }
    );
  }
}

export class CatalogServiceUnavailableException extends OrderException {
  constructor(details?: Record<string, unknown>) {
    super(
      'CATALOG_SERVICE_UNAVAILABLE',
      'Tidak dapat menghubungi catalog-service',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

export class ProvisioningFailedException extends OrderException {
  constructor(orderId?: string, reason?: string) {
    super(
      'PROVISIONING_FAILED',
      'Gagal membuat droplet di DigitalOcean',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { orderId, reason }
    );
  }
}

export class DigitalOceanUnavailableException extends OrderException {
  constructor(details?: Record<string, unknown>) {
    super(
      'DIGITALOCEAN_UNAVAILABLE',
      'Tidak dapat menghubungi DigitalOcean API',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

export class ProvisioningTimeoutException extends OrderException {
  constructor(orderId?: string, attempts?: number) {
    super(
      'PROVISIONING_TIMEOUT',
      'Droplet tidak ready dalam waktu yang ditentukan',
      HttpStatus.GATEWAY_TIMEOUT,
      { orderId, attempts }
    );
  }
}

/**
 * Insufficient balance for order creation
 */
export class InsufficientBalanceException extends OrderException {
  constructor(requiredAmount: number, currentBalance?: number) {
    super(
      'INSUFFICIENT_BALANCE',
      `Saldo tidak mencukupi untuk order ini. Dibutuhkan: Rp ${requiredAmount.toLocaleString('id-ID')}`,
      HttpStatus.BAD_REQUEST,
      { requiredAmount, currentBalance, deficit: currentBalance !== undefined ? requiredAmount - currentBalance : undefined }
    );
  }
}

/**
 * Billing service unavailable
 */
export class BillingServiceUnavailableException extends OrderException {
  constructor(details?: Record<string, unknown>) {
    super(
      'BILLING_SERVICE_UNAVAILABLE',
      'Tidak dapat menghubungi billing-service',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

/**
 * State transition conflict (race condition detected)
 * Thrown when trying to transition an order to a new state but the current state
 * doesn't match the expected state (optimistic locking failure)
 */
export class StateTransitionConflictException extends OrderException {
  constructor(orderId: string, fromStatus: string, toStatus: string) {
    super(
      'STATE_TRANSITION_CONFLICT',
      `Order ${orderId} tidak dapat diubah dari ${fromStatus} ke ${toStatus}. Status mungkin sudah berubah.`,
      HttpStatus.CONFLICT,
      { orderId, fromStatus, toStatus }
    );
  }
}

/**
 * Invalid billing period for the selected plan
 */
export class InvalidBillingPeriodException extends OrderException {
  constructor(billingPeriod: string, planId?: string) {
    super(
      'INVALID_BILLING_PERIOD',
      `Billing period ${billingPeriod} tidak tersedia untuk plan ini`,
      HttpStatus.BAD_REQUEST,
      { billingPeriod, planId }
    );
  }
}

/**
 * Order is not in ACTIVE status for console/power operations
 */
export class OrderNotActiveException extends OrderException {
  constructor(orderId: string) {
    super(
      'ORDER_NOT_ACTIVE',
      'VPS harus dalam status ACTIVE untuk mengakses console',
      HttpStatus.BAD_REQUEST,
      { orderId }
    );
  }
}

/**
 * Droplet is not ready or not provisioned
 */
export class DropletNotReadyException extends OrderException {
  constructor(orderId: string) {
    super(
      'DROPLET_NOT_READY',
      'Droplet belum siap atau tidak ditemukan',
      HttpStatus.BAD_REQUEST,
      { orderId }
    );
  }
}

/**
 * Failed to get console access from DigitalOcean
 */
export class ConsoleAccessFailedException extends OrderException {
  constructor(dropletId: string, reason?: string) {
    super(
      'CONSOLE_ACCESS_FAILED',
      'Gagal mendapatkan akses console',
      HttpStatus.SERVICE_UNAVAILABLE,
      { dropletId, reason }
    );
  }
}

/**
 * Failed to perform power action on droplet
 */
export class PowerActionFailedException extends OrderException {
  constructor(dropletId: string, action: string, reason?: string) {
    super(
      'POWER_ACTION_FAILED',
      `Gagal melakukan ${action} pada VPS`,
      HttpStatus.SERVICE_UNAVAILABLE,
      { dropletId, action, reason }
    );
  }
}
