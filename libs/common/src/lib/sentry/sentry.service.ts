import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService implements OnModuleInit {
  onModuleInit() {
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        release: process.env.SENTRY_RELEASE,
        tracesSampleRate: 0.1,
      });
    }
  }

  captureException(exception: Error, context?: Record<string, any>) {
    Sentry.captureException(exception, { extra: context });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
    Sentry.captureMessage(message, level);
  }
}
