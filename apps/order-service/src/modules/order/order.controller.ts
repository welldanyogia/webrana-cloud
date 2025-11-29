import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto, PaginationQueryDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, CurrentUserData } from '../../common/decorators';

/**
 * User Order Controller
 * 
 * Public endpoints for users to create and view their orders.
 * All endpoints require JWT authentication.
 * 
 * Endpoints:
 * - POST /api/v1/orders - Create new order
 * - GET /api/v1/orders - List user's orders (paginated)
 * - GET /api/v1/orders/:id - Get single order with provisioning details
 */
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Create a new order
   * 
   * POST /api/v1/orders
   * 
   * Body:
   * - planId: UUID of the plan
   * - imageId: UUID of the image
   * - duration: MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL
   * - couponCode?: Optional coupon code
   * 
   * Response 201:
   * {
   *   "data": {
   *     "id": "uuid",
   *     "status": "PENDING_PAYMENT",
   *     "pricing": { basePrice, promoDiscount, couponDiscount, finalPrice, currency },
   *     "items": [...],
   *     "createdAt": "ISO date"
   *   }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateOrderDto
  ) {
    const order = await this.orderService.createOrder(user.userId, dto);

    return {
      data: {
        id: order.id,
        status: order.status,
        pricing: {
          basePrice: order.basePrice,
          promoDiscount: order.promoDiscount,
          couponDiscount: order.couponDiscount,
          finalPrice: order.finalPrice,
          currency: order.currency,
        },
        items: order.items,
        createdAt: order.createdAt,
      },
    };
  }

  /**
   * List user's orders (paginated)
   * 
   * GET /api/v1/orders?page=1&limit=10&status=ACTIVE
   * 
   * Query:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 10, max: 100)
   * - status?: Filter by OrderStatus
   * 
   * Response 200:
   * {
   *   data: [...orders],
   *   meta: { page, limit, total, totalPages }
   * }
   */
  @Get()
  async getMyOrders(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.orderService.getOrdersByUserId(userId, query);
  }

  /**
   * Get single order by ID
   * 
   * GET /api/v1/orders/:id
   * 
   * - Returns 404 if order not found
   * - Returns 403 if order doesn't belong to user
   * - Includes ProvisioningTask if exists
   * 
   * Response 200:
   * {
   *   "data": {
   *     "id": "uuid",
   *     "status": "ACTIVE",
   *     "pricing": {...},
   *     "items": [...],
   *     "provisioningTask": { dropletId, ipv4Public, status, ... } | null,
   *     "paidAt": "ISO date",
   *     "createdAt": "ISO date"
   *   }
   * }
   */
  @Get(':id')
  async getOrderById(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    const order = await this.orderService.getOrderById(orderId, userId);

    return {
      data: {
        id: order.id,
        status: order.status,
        pricing: {
          basePrice: order.basePrice,
          promoDiscount: order.promoDiscount,
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
              startedAt: order.provisioningTask.startedAt,
              completedAt: order.provisioningTask.completedAt,
            }
          : null,
        paidAt: order.paidAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    };
  }
}
