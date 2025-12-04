import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException) || 
        (exception instanceof HttpException && exception.getStatus() >= 500)) {
      Sentry.captureException(exception);
    }
    super.catch(exception, host);
  }
}
