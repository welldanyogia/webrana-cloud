import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import { QueueService } from './queue.service';

/**
 * Queue Controller - Admin API
 * 
 * Provides endpoints for queue management and monitoring.
 * Protected by API key authentication.
 */
@Controller('internal/queue')
@UseGuards(ApiKeyGuard)
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * GET /internal/queue/stats
   * Get queue statistics
   */
  @Get('stats')
  async getStats() {
    const stats = await this.queueService.getStats();
    return {
      data: {
        ...stats,
        status: stats.connected ? 'healthy' : 'disconnected',
      },
    };
  }

  /**
   * POST /internal/queue/retry-failed
   * Retry all failed jobs
   */
  @Post('retry-failed')
  @HttpCode(HttpStatus.OK)
  async retryFailed() {
    const count = await this.queueService.retryFailedJobs();
    return {
      data: {
        retriedCount: count,
        message: `${count} failed jobs requeued for retry`,
      },
    };
  }

  /**
   * POST /internal/queue/clear-failed
   * Clear all failed jobs
   */
  @Post('clear-failed')
  @HttpCode(HttpStatus.OK)
  async clearFailed() {
    const count = await this.queueService.clearFailedJobs();
    return {
      data: {
        clearedCount: count,
        message: `${count} failed jobs cleared`,
      },
    };
  }
}
