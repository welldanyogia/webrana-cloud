import {
  Catch,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as Record<string, unknown>).message as string || exception.message;
        errorCode = (exceptionResponse as Record<string, unknown>).error as string || 'HTTP_ERROR';
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Only report 5xx errors to Sentry
    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setExtra('path', request.url);
        scope.setExtra('method', request.method);
        scope.setExtra('statusCode', status);

        if (request.user) {
          scope.setUser({
            id: request.user.userId || request.user.sub,
          });
        }

        Sentry.captureException(exception);
      });
    }

    response.status(status).json({
      error: {
        code: errorCode,
        message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}
