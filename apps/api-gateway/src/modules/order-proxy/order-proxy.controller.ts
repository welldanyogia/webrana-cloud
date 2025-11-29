import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../../common/guards/user-throttle.guard';

/**
 * Order Proxy Controller
 * 
 * Proxies order requests to order-service with rate limiting.
 * 
 * Rate Limits:
 * - POST /orders: 10 per minute per user (order creation)
 * - GET /orders: 100 per minute per user (general API)
 * - GET /orders/:id: 100 per minute per user (general API)
 */
@Controller('orders')
@UseGuards(UserThrottlerGuard)
export class OrderProxyController {
  private readonly logger = new Logger(OrderProxyController.name);

  /**
   * Create order - 10 requests per minute per user
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createOrder(@Body() createOrderDto: any) {
    this.logger.log('Create order request received - would proxy to order-service');
    
    // TODO: Implement actual proxy to order-service when ready
    return {
      data: {
        message: 'Create order endpoint - proxied to order-service',
        note: 'Rate limited: 10 requests per minute per user',
      },
    };
  }

  /**
   * List orders - 100 requests per minute per user (general API limit)
   */
  @Get()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async listOrders(@Query() query: any) {
    this.logger.log('List orders request received - would proxy to order-service');
    
    // TODO: Implement actual proxy to order-service when ready
    return {
      data: {
        message: 'List orders endpoint - proxied to order-service',
        note: 'Rate limited: 100 requests per minute per user',
      },
      meta: {
        page: query.page || 1,
        limit: query.limit || 10,
      },
    };
  }

  /**
   * Get order by ID - 100 requests per minute per user (general API limit)
   */
  @Get(':id')
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getOrder(@Param('id') id: string) {
    this.logger.log(`Get order ${id} request received - would proxy to order-service`);
    
    // TODO: Implement actual proxy to order-service when ready
    return {
      data: {
        message: `Get order ${id} endpoint - proxied to order-service`,
        note: 'Rate limited: 100 requests per minute per user',
      },
    };
  }
}
