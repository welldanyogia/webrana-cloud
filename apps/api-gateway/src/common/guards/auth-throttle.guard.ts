import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Auth Throttler Guard
 * 
 * Rate limits authentication endpoints by IP address.
 * Used for login, register, password reset, etc.
 * 
 * Rate limits:
 * - Login: 5 per minute per IP
 * - Register: 3 per minute per IP
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  /**
   * Get tracker key based on client IP address
   * Auth endpoints should be rate limited by IP since users aren't authenticated yet.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;
    return this.getClientIp(request);
  }

  /**
   * Generate storage key that includes the endpoint path for more granular limiting.
   */
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest<Request>();
    const endpoint = request.path.replace(/\//g, '_');
    return `auth_throttle:${suffix}:${endpoint}:${name}`;
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
