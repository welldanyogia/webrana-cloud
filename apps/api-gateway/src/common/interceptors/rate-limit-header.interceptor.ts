import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response, Request } from 'express';

/**
 * Rate Limit Header Interceptor
 * 
 * Adds standard rate limit headers to all responses:
 * - X-RateLimit-Limit: Maximum requests allowed in the window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when the limit resets
 * 
 * These headers help clients implement proper backoff and retry logic.
 */
@Injectable()
export class RateLimitHeaderInterceptor implements NestInterceptor {
  /**
   * Rate limit configurations per endpoint pattern
   * Key: endpoint pattern, Value: { limit, windowSeconds }
   */
  private readonly rateLimits: Record<string, { limit: number; windowSeconds: number }> = {
    // Auth endpoints (sensitive - per IP)
    '/auth/login': { limit: 5, windowSeconds: 60 },
    '/auth/register': { limit: 3, windowSeconds: 60 },
    '/auth/forgot-password': { limit: 3, windowSeconds: 60 },
    
    // Order endpoints (heavy - per user)
    '/orders:POST': { limit: 20, windowSeconds: 60 },
    '/orders': { limit: 100, windowSeconds: 60 },
    
    // Instance endpoints (general - per user)
    '/instances': { limit: 100, windowSeconds: 60 },
    
    // Instance action endpoints (per instance)
    '/instances/action': { limit: 1, windowSeconds: 60 },
    
    // Default fallback
    'default': { limit: 100, windowSeconds: 60 },
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      tap(() => {
        const rateConfig = this.getRateLimitConfig(request);
        
        // Calculate reset time (current time + window)
        const resetTime = Math.floor(Date.now() / 1000) + rateConfig.windowSeconds;
        
        // Set rate limit headers
        // Note: Actual remaining count would need to be tracked by throttler storage
        // This is a simplified implementation showing the limit and reset time
        response.setHeader('X-RateLimit-Limit', rateConfig.limit.toString());
        response.setHeader('X-RateLimit-Reset', resetTime.toString());
        
        // X-RateLimit-Remaining would ideally come from the throttler storage
        // For now, we'll indicate the theoretical maximum remaining
        // In production, this should be integrated with ThrottlerStorage
        if (!response.getHeader('X-RateLimit-Remaining')) {
          response.setHeader('X-RateLimit-Remaining', rateConfig.limit.toString());
        }
      }),
    );
  }

  /**
   * Get rate limit configuration based on request path and method
   */
  private getRateLimitConfig(request: Request): { limit: number; windowSeconds: number } {
    const path = request.path;
    const method = request.method;

    // Check for specific method+path combination first
    const methodPath = `${path}:${method}`;
    if (this.rateLimits[methodPath]) {
      return this.rateLimits[methodPath];
    }

    // Check for instance action endpoints
    if (path.match(/^\/instances\/[^/]+\/(start|stop|reboot|power-on|power-off)$/)) {
      return this.rateLimits['/instances/action'];
    }

    // Check for path prefix matches
    for (const [pattern, config] of Object.entries(this.rateLimits)) {
      if (pattern !== 'default' && !pattern.includes(':') && path.startsWith(pattern)) {
        return config;
      }
    }

    return this.rateLimits['default'];
  }
}
