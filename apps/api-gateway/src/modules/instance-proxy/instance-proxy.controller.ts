import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttle.guard';
import { InstanceThrottlerGuard } from '../../common/guards/instance-throttle.guard';

/**
 * Instance Proxy Controller
 * 
 * Proxies VPS instance requests to instance-service with rate limiting.
 * 
 * Rate Limits:
 * - GET /instances: 100 per minute per user (general API)
 * - GET /instances/:id: 100 per minute per user (general API)
 * - POST /instances/:id/start: 1 per minute per instance
 * - POST /instances/:id/stop: 1 per minute per instance
 * - POST /instances/:id/reboot: 1 per minute per instance
 * - POST /instances/:id/power-on: 1 per minute per instance
 * - POST /instances/:id/power-off: 1 per minute per instance
 */
@Controller('instances')
export class InstanceProxyController {
  private readonly logger = new Logger(InstanceProxyController.name);

  /**
   * List instances - 100 requests per minute per user (general API limit)
   */
  @Get()
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async listInstances(@Query() query: any) {
    this.logger.log('List instances request received - would proxy to instance-service');
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: 'List instances endpoint - proxied to instance-service',
        note: 'Rate limited: 100 requests per minute per user',
      },
      meta: {
        page: query.page || 1,
        limit: query.limit || 10,
      },
    };
  }

  /**
   * Get instance by ID - 100 requests per minute per user (general API limit)
   */
  @Get(':instanceId')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Get instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Get instance ${instanceId} endpoint - proxied to instance-service`,
        note: 'Rate limited: 100 requests per minute per user',
      },
    };
  }

  /**
   * Start instance - 1 request per minute per instance
   * VPS power-on action
   */
  @Post(':instanceId/start')
  @UseGuards(InstanceThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async startInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Start instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Start instance ${instanceId} action - proxied to instance-service`,
        note: 'Rate limited: 1 request per minute per instance',
        action: 'start',
      },
    };
  }

  /**
   * Stop instance - 1 request per minute per instance
   * VPS power-off action (graceful shutdown)
   */
  @Post(':instanceId/stop')
  @UseGuards(InstanceThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async stopInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Stop instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Stop instance ${instanceId} action - proxied to instance-service`,
        note: 'Rate limited: 1 request per minute per instance',
        action: 'stop',
      },
    };
  }

  /**
   * Reboot instance - 1 request per minute per instance
   * VPS restart action
   */
  @Post(':instanceId/reboot')
  @UseGuards(InstanceThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async rebootInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Reboot instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Reboot instance ${instanceId} action - proxied to instance-service`,
        note: 'Rate limited: 1 request per minute per instance',
        action: 'reboot',
      },
    };
  }

  /**
   * Power on instance - 1 request per minute per instance
   * VPS hard power-on action
   */
  @Post(':instanceId/power-on')
  @UseGuards(InstanceThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async powerOnInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Power on instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Power on instance ${instanceId} action - proxied to instance-service`,
        note: 'Rate limited: 1 request per minute per instance',
        action: 'power-on',
      },
    };
  }

  /**
   * Power off instance - 1 request per minute per instance
   * VPS hard power-off action (immediate shutdown)
   */
  @Post(':instanceId/power-off')
  @UseGuards(InstanceThrottlerGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async powerOffInstance(@Param('instanceId') instanceId: string) {
    this.logger.log(`Power off instance ${instanceId} request received - would proxy to instance-service`);
    
    // TODO: Implement actual proxy to instance-service when ready
    return {
      data: {
        message: `Power off instance ${instanceId} action - proxied to instance-service`,
        note: 'Rate limited: 1 request per minute per instance',
        action: 'power-off',
      },
    };
  }
}
