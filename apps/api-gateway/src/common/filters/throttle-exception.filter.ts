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
 * Follows the standard error response format: { statusCode, error, message, retryAfter }
 * 
 * Response Headers:
 * - Retry-After: Seconds until rate limit resets
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Always 0 when exceeded
 * - X-RateLimit-Reset: Unix timestamp when limit resets
 */
@Catch(ThrottlerException)
export class ThrottleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottleExceptionFilter.name);

  /**
   * Default retry after time in seconds
   * Can be overridden by extracting from throttler metadata
   */
  private readonly DEFAULT_RETRY_AFTER = 60;

  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Extract client identifier for logging
    const clientIp = this.getClientIp(request);
    const userId = (request as any).user?.sub || 'anonymous';
    const endpoint = `${request.method} ${request.url}`;

    // Calculate retry after time and reset timestamp
    const retryAfter = this.getRetryAfter(request);
    const resetTimestamp = Math.floor(Date.now() / 1000) + retryAfter;
    const limit = this.getRateLimitForEndpoint(request);

    this.logger.warn(
      `Rate limit exceeded - IP: ${clientIp}, User: ${userId}, Endpoint: ${endpoint}, RetryAfter: ${retryAfter}s`
    );

    // Set rate limit headers
    response.setHeader('Retry-After', retryAfter.toString());
    response.setHeader('X-RateLimit-Limit', limit.toString());
    response.setHeader('X-RateLimit-Remaining', '0');
    response.setHeader('X-RateLimit-Reset', resetTimestamp.toString());

    response.status(429).json({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      retryAfter,
      details: {
        code: 'RATE_LIMIT_EXCEEDED',
        endpoint: request.url,
        resetAt: new Date(resetTimestamp * 1000).toISOString(),
      },
    });
  }

  /**
   * Get retry after time based on endpoint
   */
  private getRetryAfter(request: Request): number {
    const path = request.path;
    
    // Auth endpoints - 60 seconds
    if (path.startsWith('/auth/')) {
      return 60;
    }
    
    // Instance actions - 60 seconds
    if (path.match(/^\/instances\/[^/]+\/(start|stop|reboot|power-on|power-off)$/)) {
      return 60;
    }
    
    // Default
    return this.DEFAULT_RETRY_AFTER;
  }

  /**
   * Get rate limit value for the endpoint (for header)
   */
  private getRateLimitForEndpoint(request: Request): number {
    const path = request.path;
    const method = request.method;
    
    // Auth endpoints (sensitive)
    if (path === '/auth/login') return 5;
    if (path === '/auth/register') return 3;
    if (path === '/auth/forgot-password') return 3;
    
    // Order creation (heavy)
    if (path === '/orders' && method === 'POST') return 20;
    
    // Instance actions (per instance)
    if (path.match(/^\/instances\/[^/]+\/(start|stop|reboot|power-on|power-off)$/)) {
      return 1;
    }
    
    // Default (general API)
    return 100;
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
