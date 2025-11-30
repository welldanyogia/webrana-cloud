import { Injectable, Inject, OnModuleInit, Optional } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export interface SentryModuleOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  debug?: boolean;
}

export const SENTRY_OPTIONS = 'SENTRY_OPTIONS';

@Injectable()
export class SentryService implements OnModuleInit {
  private initialized = false;

  constructor(
    @Optional() @Inject(SENTRY_OPTIONS) private options?: SentryModuleOptions
  ) {}

  onModuleInit() {
    if (this.options?.dsn && !this.initialized) {
      Sentry.init({
        dsn: this.options.dsn,
        environment: this.options.environment || 'development',
        release: this.options.release,
        tracesSampleRate: this.options.tracesSampleRate ?? 0.1,
        debug: this.options.debug ?? false,
      });
      this.initialized = true;
    }
  }

  captureException(exception: Error, context?: Record<string, unknown>): string {
    return Sentry.captureException(exception, { extra: context });
  }

  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = 'info'
  ): string {
    return Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    Sentry.setUser(user);
  }

  clearUser(): void {
    Sentry.setUser(null);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    Sentry.setContext(name, context);
  }

  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  startTransaction(context: {
    name: string;
    op?: string;
    data?: Record<string, unknown>;
  }) {
    return Sentry.startInactiveSpan({
      name: context.name,
      op: context.op,
      attributes: context.data as Record<string, string>,
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
