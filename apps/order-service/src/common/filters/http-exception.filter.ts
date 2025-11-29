import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { OrderException } from '../exceptions/order.exceptions';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: {
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

    if (exception instanceof OrderException) {
      status = exception.getStatus();
      errorResponse = {
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details && { details: exception.details }),
        },
      };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        errorResponse = {
          error: {
            code: (resp['code'] as string) || this.getDefaultCode(status),
            message: (resp['message'] as string) || exception.message,
            ...(resp['details'] && {
              details: resp['details'] as Record<string, unknown>,
            }),
          },
        };
      } else {
        errorResponse = {
          error: {
            code: this.getDefaultCode(status),
            message: exception.message,
          },
        };
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack
      );
      errorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message:
            process.env.NODE_ENV === 'production'
              ? 'An unexpected error occurred'
              : exception.message,
        },
      };
    } else {
      this.logger.error('Unknown exception type', exception);
      errorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      };
    }

    this.logger.warn(
      `${request.method} ${request.url} - ${status} - ${errorResponse.error.code}: ${errorResponse.error.message}`
    );

    response.status(status).json(errorResponse);
  }

  private getDefaultCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
