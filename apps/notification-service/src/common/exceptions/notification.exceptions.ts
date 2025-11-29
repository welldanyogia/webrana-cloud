import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for notification-service
 */
export class NotificationException extends HttpException {
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
 * Email-related exceptions
 */
export class EmailSendFailedException extends NotificationException {
  constructor(email: string, error?: string) {
    super(
      'EMAIL_SEND_FAILED',
      `Gagal mengirim email ke ${email}`,
      HttpStatus.BAD_GATEWAY,
      { email, error }
    );
  }
}

export class EmailConfigurationException extends NotificationException {
  constructor(details?: string) {
    super(
      'EMAIL_NOT_CONFIGURED',
      'SMTP configuration tidak valid',
      HttpStatus.SERVICE_UNAVAILABLE,
      { details }
    );
  }
}

/**
 * Telegram-related exceptions
 */
export class TelegramSendFailedException extends NotificationException {
  constructor(chatId: string, error?: string) {
    super(
      'TELEGRAM_SEND_FAILED',
      `Gagal mengirim pesan Telegram ke ${chatId}`,
      HttpStatus.BAD_GATEWAY,
      { chatId, error }
    );
  }
}

export class TelegramConfigurationException extends NotificationException {
  constructor(details?: string) {
    super(
      'TELEGRAM_NOT_CONFIGURED',
      'Telegram bot tidak dikonfigurasi',
      HttpStatus.SERVICE_UNAVAILABLE,
      { details }
    );
  }
}

/**
 * User-related exceptions
 */
export class UserNotFoundException extends NotificationException {
  constructor(userId: string) {
    super(
      'USER_NOT_FOUND',
      `User dengan ID ${userId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { userId }
    );
  }
}

export class UserNoContactException extends NotificationException {
  constructor(userId: string, channel: string) {
    super(
      'USER_NO_CONTACT',
      `User ${userId} tidak memiliki ${channel} yang terdaftar`,
      HttpStatus.BAD_REQUEST,
      { userId, channel }
    );
  }
}

/**
 * Auth service related exceptions
 */
export class AuthServiceUnavailableException extends NotificationException {
  constructor(details?: Record<string, unknown>) {
    super(
      'AUTH_SERVICE_UNAVAILABLE',
      'Auth service tidak tersedia. Silakan coba lagi nanti.',
      HttpStatus.SERVICE_UNAVAILABLE,
      details
    );
  }
}

/**
 * General notification exceptions
 */
export class InvalidNotificationEventException extends NotificationException {
  constructor(event: string) {
    super(
      'INVALID_NOTIFICATION_EVENT',
      `Event notification tidak valid: ${event}`,
      HttpStatus.BAD_REQUEST,
      { event }
    );
  }
}

export class NotificationLogNotFoundException extends NotificationException {
  constructor(logId: string) {
    super(
      'NOTIFICATION_LOG_NOT_FOUND',
      `Log notification dengan ID ${logId} tidak ditemukan`,
      HttpStatus.NOT_FOUND,
      { logId }
    );
  }
}
