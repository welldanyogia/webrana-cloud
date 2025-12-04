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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CurrentUser, CurrentUserData } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';

import { CreateOrderDto, PaginationQueryDto } from './dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiBearerAuth('bearer')
@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new order', description: 'Create a new VPS order with selected plan, image, and duration' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or plan/image not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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

  @Get()
  @ApiOperation({ summary: 'List user orders', description: 'Get paginated list of orders for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by order status' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrders(
    @CurrentUser('userId') userId: string,
    @Query() query: PaginationQueryDto
  ) {
    return this.orderService.getOrdersByUserId(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID', description: 'Get order details including provisioning status' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied - order belongs to another user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
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

  // ==========================================
  // VPS Console & Power Control Endpoints
  // ==========================================

  @Get(':id/console')
  @ApiOperation({ summary: 'Get VNC console URL', description: 'Get temporary VNC console URL for the VPS' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Console URL retrieved successfully' })
  @ApiResponse({ status: 400, description: 'VPS not active or droplet not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 503, description: 'Console access failed' })
  async getConsoleUrl(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ): Promise<{ data: { url: string; expiresAt: string } }> {
    const result = await this.orderService.getConsoleUrl(orderId, userId);
    return { data: result };
  }

  @Post(':id/power-on')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Power on VPS', description: 'Turn on the VPS' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Power on initiated' })
  @ApiResponse({ status: 400, description: 'VPS not active or droplet not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async powerOn(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    await this.orderService.powerAction(orderId, userId, 'power_on');
    return { data: { success: true, message: 'VPS sedang dinyalakan' } };
  }

  @Post(':id/power-off')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Power off VPS', description: 'Turn off the VPS' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Power off initiated' })
  @ApiResponse({ status: 400, description: 'VPS not active or droplet not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async powerOff(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    await this.orderService.powerAction(orderId, userId, 'power_off');
    return { data: { success: true, message: 'VPS sedang dimatikan' } };
  }

  @Post(':id/reboot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reboot VPS', description: 'Restart the VPS' })
  @ApiParam({ name: 'id', type: String, description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Reboot initiated' })
  @ApiResponse({ status: 400, description: 'VPS not active or droplet not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async reboot(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) orderId: string
  ) {
    await this.orderService.powerAction(orderId, userId, 'reboot');
    return { data: { success: true, message: 'VPS sedang di-reboot' } };
  }
}
