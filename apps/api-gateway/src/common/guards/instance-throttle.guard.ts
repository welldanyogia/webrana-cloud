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
 * Instance Throttler Guard
 * 
 * Rate limits VPS instance actions by instance ID + user.
 * Used for power actions (start, stop, reboot, etc.)
 * 
 * Rate limits:
 * - VPS Actions: 1 per minute per instance
 */
@Injectable()
export class InstanceThrottlerGuard extends ThrottlerGuard {
  /**
   * Get tracker key combining user ID and instance ID.
   * This ensures rate limiting per instance per user.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as AuthenticatedRequest;
    
    // Extract instance ID from route params or body
    const instanceId = 
      request.params?.instanceId || 
      request.params?.id || 
      request.body?.instanceId ||
      'unknown';
    
    // Get user ID or fall back to IP
    const userId = request.user?.sub || this.getClientIp(request);
    
    return `instance:${instanceId}:user:${userId}`;
  }

  /**
   * Generate storage key that includes the action type for granular limiting.
   */
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest<Request>();
    const action = this.extractAction(request);
    return `instance_throttle:${suffix}:${action}:${name}`;
  }

  /**
   * Extract action type from the request path or body.
   */
  private extractAction(request: Request): string {
    // Try to extract action from URL path (e.g., /instances/:id/reboot)
    const pathParts = request.path.split('/');
    const actionIndex = pathParts.findIndex(
      (part) => ['start', 'stop', 'reboot', 'power-on', 'power-off', 'resize', 'rebuild', 'snapshot'].includes(part)
    );
    
    if (actionIndex !== -1) {
      return pathParts[actionIndex];
    }
    
    // Fall back to request body action field
    return request.body?.action || 'action';
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
