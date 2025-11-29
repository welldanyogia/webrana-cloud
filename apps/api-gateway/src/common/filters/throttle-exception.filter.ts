import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response, Request } from 'express';

/**
 * Custom exception filter for rate limiting (429 Too Many Requests)
 * 
 * Provides user-friendly error response when rate limit is exceeded.
 * Follows the standard error response format: { error: { code, message, details } }
 */
@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottleExceptionFilter.name);

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract client identifier for logging
    const clientIp = this.getClientIp(request);
    const userId = (request as any).user?.sub || 'anonymous';
    const endpoint = `${request.method} ${request.url}`;

    this.logger.warn(
      `Rate limit exceeded - IP: ${clientIp}, User: ${userId}, Endpoint: ${endpoint}`
    );

    response.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Terlalu banyak permintaan. Silakan coba lagi nanti.',
        details: {
          retryAfter: 60,
          retryAfterUnit: 'seconds',
          endpoint: request.url,
        },
      },
    });
  }

  private getClientIp(request: Request): string {
    // Handle proxied requests (e.g., behind nginx/load balancer)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
