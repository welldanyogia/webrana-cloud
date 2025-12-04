import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { ApiKeyGuard } from '../../common/guards';

import { UpdatePaymentStatusDto, AdminPaginationQueryDto } from './dto';
import { OrderService } from './order.service';
import { PaymentService } from './payment.service';

/**
 * Internal Order Controller
 * 
 * Admin/Internal endpoints for order management.
 * All endpoints require API key authentication (X-API-Key header).
 * 
 * Endpoints:
 * - POST /internal/orders/:id/payment-status - Update payment status (PAID/PAYMENT_FAILED)
 * - GET /internal/orders - List all orders (admin view, no ownership check)
 * - GET /internal/orders/:id - Get order detail (includes history)
 */
@ApiTags('Internal')
@ApiSecurity('api-key')
@Controller('internal/orders')
@UseGuards(ApiKeyGuard)
export class InternalOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly paymentService: PaymentService
  ) {}

  /**
   * Update payment status
   * 
   * POST /internal/orders/:id/payment-status
   * 
   * Body:
   * - status: 'PAID' | 'PAYMENT_FAILED'
   * - notes?: Optional notes for status history
   * 
   * Behavior:
   * - PAID: Updates order to PAID, triggers provisioning
   * - PAYMENT_FAILED: Records event in history, order stays PENDING_PAYMENT
   */
  @Post(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Update payment status', 
    description: 'Update order payment status. PAID triggers VPS provisioning, PAYMENT_FAILED records the failure event.' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiBody({ type: UpdatePaymentStatusDto })
  @ApiResponse({ status: 200, description: 'Payment status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition or order not found' })
  @ApiResponse({ status: 401, description: 'API key missing or invalid' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updatePaymentStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string,
    @Body() dto: UpdatePaymentStatusDto
  ) {
    const result = await this.paymentService.updatePaymentStatus(
      orderId,
      dto,
      'admin' // Actor for status history
    );

    return {
      data: {
        id: result.id,
        status: result.status,
        previousStatus: result.previousStatus,
        paidAt: result.paidAt,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * List all orders (admin view)
   * 
   * GET /internal/orders?status=ACTIVE&userId=xxx&page=1&limit=10
   * 
   * Query:
   * - status?: Filter by OrderStatus
   * - userId?: Filter by user
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * 
   * No ownership check - admin can see all orders.
   */
  @Get()
  @ApiOperation({ 
    summary: 'List all orders (admin)', 
    description: 'Get paginated list of all orders with optional filters. Admin view - no ownership check.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'API key missing or invalid' })
  async listOrders(@Query() query: AdminPaginationQueryDto) {
    const result = await this.orderService.getAllOrders(query);

    return {
      data: result.data.map((order) => ({
        id: order.id,
        userId: order.userId,
        status: order.status,
        planId: order.planId,
        planName: order.planName,
        finalPrice: order.finalPrice,
        currency: order.currency,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
      })),
      meta: result.meta,
    };
  }

  /**
   * Get order detail (admin view)
   * 
   * GET /internal/orders/:id
   * 
   * Includes:
   * - Order details
   * - OrderItems
   * - ProvisioningTask (if exists)
   * - StatusHistory
   * 
   * No ownership check - admin can see any order.
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Get order detail (admin)', 
    description: 'Get full order details including items, provisioning task, and status history. Admin view - no ownership check.' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order detail retrieved successfully' })
  @ApiResponse({ status: 401, description: 'API key missing or invalid' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderDetail(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    const order = await this.orderService.getOrderByIdAdmin(orderId);

    return {
      data: {
        id: order.id,
        userId: order.userId,
        status: order.status,
        planId: order.planId,
        planName: order.planName,
        imageId: order.imageId,
        imageName: order.imageName,
        duration: order.duration,
        pricing: {
          basePrice: order.basePrice,
          promoDiscount: order.promoDiscount,
          couponCode: order.couponCode,
          couponDiscount: order.couponDiscount,
          finalPrice: order.finalPrice,
          currency: order.currency,
        },
        items: order.items,
        provisioningTask: order.provisioningTask
          ? {
              id: order.provisioningTask.id,
              status: order.provisioningTask.status,
              dropletId: order.provisioningTask.dropletId,
              dropletName: order.provisioningTask.dropletName,
              dropletStatus: order.provisioningTask.dropletStatus,
              ipv4Public: order.provisioningTask.ipv4Public,
              ipv4Private: order.provisioningTask.ipv4Private,
              doRegion: order.provisioningTask.doRegion,
              doSize: order.provisioningTask.doSize,
              doImage: order.provisioningTask.doImage,
              errorCode: order.provisioningTask.errorCode,
              errorMessage: order.provisioningTask.errorMessage,
              attempts: order.provisioningTask.attempts,
              startedAt: order.provisioningTask.startedAt,
              completedAt: order.provisioningTask.completedAt,
            }
          : null,
        statusHistory: order.statusHistory?.map((h) => ({
          id: h.id,
          previousStatus: h.previousStatus,
          newStatus: h.newStatus,
          actor: h.actor,
          reason: h.reason,
          metadata: h.metadata,
          createdAt: h.createdAt,
        })),
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }

  /**
   * Retry provisioning for a failed order
   * 
   * POST /internal/orders/:id/retry-provisioning
   * 
   * This endpoint allows admin to manually retry provisioning for orders
   * that failed during the provisioning phase.
   * 
   * Requirements:
   * - Order must be in FAILED status
   * - Order must have a provisioning task (i.e., provisioning was attempted)
   * 
   * Behavior:
   * - Resets order status to PROCESSING
   * - Resets provisioning task for retry
   * - Triggers provisioning process again
   */
  @Post(':id/retry-provisioning')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Retry failed provisioning', 
    description: 'Retry provisioning for an order that failed during VPS creation. Only works for orders in FAILED status.' 
  })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Provisioning retry initiated successfully' })
  @ApiResponse({ status: 400, description: 'Order is not in FAILED status or has no provisioning task' })
  @ApiResponse({ status: 401, description: 'API key missing or invalid' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async retryProvisioning(
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    const result = await this.orderService.retryProvisioning(
      orderId,
      'admin' // Actor for status history
    );

    return {
      data: {
        message: result.message,
        orderId: result.orderId,
        newStatus: result.newStatus,
        retryInitiatedAt: new Date().toISOString(),
      },
    };
  }
}
