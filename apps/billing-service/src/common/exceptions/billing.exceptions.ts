import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for billing-service
 */
export class BillingException extends HttpException {
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
 * Invoice-related exceptions
 */
export class InvoiceNotFoundException extends BillingException {
  constructor(invoiceId: string) {
    super(
      'INVOICE_NOT_FOUND',
      `Invoice dengan ID ${invoiceId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { invoiceId }
    );
  }
}

export class InvoiceAlreadyExistsException extends BillingException {
  constructor(orderId: string) {
    super(
      'INVOICE_ALREADY_EXISTS',
      `Invoice untuk order ${orderId} sudah ada`,
      HttpStatus.CONFLICT,
      { orderId }
    );
  }
}

export class InvoiceAccessDeniedException extends BillingException {
  constructor(invoiceId: string) {
    super(
      'INVOICE_ACCESS_DENIED',
      'Anda tidak memiliki akses ke invoice ini',
      HttpStatus.FORBIDDEN,
      { invoiceId }
    );
  }
}

export class InvoiceExpiredException extends BillingException {
  constructor(invoiceId: string) {
    super(
      'INVOICE_EXPIRED',
      'Invoice ini sudah expired',
      HttpStatus.BAD_REQUEST,
      { invoiceId }
    );
  }
}

export class InvoiceAlreadyPaidException extends BillingException {
  constructor(invoiceId: string) {
    super(
      'INVOICE_ALREADY_PAID',
      'Invoice ini sudah dibayar',
      HttpStatus.CONFLICT,
      { invoiceId }
    );
  }
}

export class InvalidInvoiceStatusException extends BillingException {
  constructor(invoiceId: string, currentStatus: string, expectedStatus: string) {
    super(
      'INVALID_INVOICE_STATUS',
      `Invoice status tidak valid. Expected: ${expectedStatus}, Current: ${currentStatus}`,
      HttpStatus.BAD_REQUEST,
      { invoiceId, currentStatus, expectedStatus }
    );
  }
}

/**
 * Tripay-related exceptions
 */
export class TripayApiException extends BillingException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      'TRIPAY_API_ERROR',
      `Tripay API error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      details
    );
  }
}

export class TripaySignatureException extends BillingException {
  constructor() {
    super(
      'TRIPAY_SIGNATURE_INVALID',
      'Invalid Tripay callback signature',
      HttpStatus.UNAUTHORIZED
    );
  }
}

export class TripayChannelNotFoundException extends BillingException {
  constructor(channel: string) {
    super(
      'TRIPAY_CHANNEL_NOT_FOUND',
      `Payment channel ${channel} tidak ditemukan atau tidak aktif`,
      HttpStatus.BAD_REQUEST,
      { channel }
    );
  }
}

/**
 * Order service related exceptions
 */
export class OrderServiceUnavailableException extends BillingException {
  constructor(details?: Record<string, unknown>) {
    super(
      'ORDER_SERVICE_UNAVAILABLE',
      'Order service tidak tersedia. Silakan coba lagi nanti.',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

export class OrderNotFoundException extends BillingException {
  constructor(orderId: string) {
    super(
      'ORDER_NOT_FOUND',
      `Order dengan ID ${orderId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { orderId }
    );
  }
}
