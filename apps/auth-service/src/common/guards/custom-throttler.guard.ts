import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Custom throttler guard that switches between IP-based and email-based tracking
 * based on the endpoint.
 * 
 * - For /forgot-password and /resend-verification: tracks by email (from request body)
 * - For all other endpoints: tracks by IP address
 * 
 * The base ThrottlerGuard handles all rate limiting logic, metadata reading,
 * and exception throwing. This guard only customizes the tracker (key) used.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const url = req.url || '';

    // Endpoints that should use email-based tracking
    const emailBasedEndpoints = ['/forgot-password', '/resend-verification'];
    const shouldUseEmail = emailBasedEndpoints.some(endpoint => url.includes(endpoint));

    if (shouldUseEmail) {
      const email = req.body?.email;
      if (email && typeof email === 'string') {
        const tracker = email.toLowerCase().trim();
        this.logger.debug(`[${url}] Using email tracker: ${tracker}`);
        return tracker;
      }
      this.logger.debug(`[${url}] Email not found, fallback to IP`);
    }

    // Default to IP tracking
    // Handle IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
    let ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    this.logger.debug(`[${url}] Using IP tracker: ${ip}`);
    return ip;
  }
}
