import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottleEmailGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottleEmailGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use email from request body if available, fallback to IP
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      const tracker = email.toLowerCase();
      this.logger.debug(`ThrottleEmailGuard - Tracker: ${tracker}, Path: ${req.url}`);
      return tracker;
    }

    // Fallback to IP if email not found or invalid
    const tracker = req.ip || req.connection?.remoteAddress || 'unknown';
    this.logger.debug(`ThrottleEmailGuard - Tracker (fallback IP): ${tracker}, Path: ${req.url}`);
    return tracker;
  }
}
