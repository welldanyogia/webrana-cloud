import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      release: process.env.NEXT_PUBLIC_APP_VERSION,

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],

      // Don't send errors in development unless DSN is set
      enabled: !!dsn,

      // Filter out common non-actionable errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error exception captured',
        'Non-Error promise rejection captured',
      ],

      beforeSend(event) {
        // Don't send events for 4xx errors (user errors)
        if (event.exception?.values?.[0]?.value?.includes('4')) {
          return null;
        }
        return event;
      },
    });
  }
}

export function setUserContext(user: { id: string; email?: string }) {
  Sentry.setUser(user);
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export { Sentry };
