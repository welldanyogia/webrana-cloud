import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
    role?: string;
  };
}

/**
 * User Throttler Guard
 * 
 * Rate limits endpoints by authenticated user ID or falls back to IP.
 * Used for general API endpoints and order creation.
 * 
 * Rate limits:
 * - Order creation: 10 per minute per user
 * - General API: 100 per minute per user
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  /**
   * Get tracker key based on user ID (if authenticated) or IP address.
   * Authenticated users get their own rate limit bucket.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as AuthenticatedRequest;
    
    // Prefer user ID for authenticated users
    if (request.user?.sub) {
      return `user:${request.user.sub}`;
    }
    
    // Fall back to IP for unauthenticated requests
    return `ip:${this.getClientIp(request)}`;
  }

  /**
   * Extract client IP, handling proxy scenarios
   */
  private getClientIp(request: Request): string {
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
