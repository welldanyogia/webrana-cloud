import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottleIpGuard extends ThrottlerGuard {
  private readonly logger = new Logger(ThrottleIpGuard.name);

  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address as tracker
    const tracker = req.ip || req.connection?.remoteAddress || 'unknown';
    this.logger.debug(`ThrottleIpGuard - Tracker: ${tracker}, Path: ${req.url}`);
    return tracker;
  }
}
