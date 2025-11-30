import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // Add request context to Sentry
    Sentry.setContext('request', {
      method: request.method,
      url: request.url,
      query: request.query,
      userAgent: request.headers?.['user-agent'],
      ip: request.ip || request.headers?.['x-forwarded-for'],
    });

    // Add user context if available
    if (request.user) {
      Sentry.setUser({
        id: request.user.userId || request.user.sub,
        email: request.user.email,
      });
    }

    // Add request ID for correlation
    const requestId = request.headers?.['x-request-id'];
    if (requestId) {
      Sentry.setTag('request_id', requestId);
    }

    return next.handle().pipe(
      catchError((error) => {
        // Only capture 5xx errors to Sentry
        const status = error.status || error.getStatus?.() || 500;
        if (status >= 500) {
          Sentry.captureException(error, {
            extra: {
              path: request.url,
              method: request.method,
              body: this.sanitizeBody(request.body),
            },
          });
        }
        return throwError(() => error);
      })
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
