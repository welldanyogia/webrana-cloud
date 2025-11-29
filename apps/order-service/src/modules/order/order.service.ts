import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CatalogClientService,
  CatalogPlan,
  CatalogImage,
} from '../catalog-client/catalog-client.service';
import { OrderStateMachine } from './order-state-machine';
import {
  CreateOrderDto,
  PaginationQueryDto,
  AdminPaginationQueryDto,
  PaginatedResult,
} from './dto';
import {
  OrderNotFoundException,
  OrderAccessDeniedException,
  InvalidDurationException,
  PaymentStatusConflictException,
} from '../../common/exceptions';
import {
  Order,
  OrderStatus,
  PlanDuration,
  ItemType,
  Prisma,
} from '@prisma/client';

// Type for order with relations
export type OrderWithRelations = Order & {
  items: Array<{
    id: string;
    itemType: ItemType;
    referenceId: string;
    description: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;
  provisioningTask?: {
    id: string;
    status: string;
    dropletId: string | null;
    dropletName: string | null;
    ipv4Public: string | null;
    ipv4Private: string | null;
    doRegion: string | null;
    dropletStatus: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    completedAt: Date | null;
  } | null;
  statusHistory?: Array<{
    id: string;
    previousStatus: string;
    newStatus: string;
    actor: string;
    reason: string | null;
    createdAt: Date;
  }>;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService
  ) {}

  /**
   * Create a new order
   * 
   * Flow:
   * 1. Fetch plan from catalog-service, validate active
   * 2. Fetch image from catalog-service, validate available
   * 3. If couponCode provided, validate via catalog-service
   * 4. Calculate pricing snapshot (all from catalog-service response)
   * 5. Create Order with status PENDING_PAYMENT
   * 6. Create OrderItem(s) for plan
   * 7. Record initial StatusHistory
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderWithRelations> {
    this.logger.log(`Creating order for user ${userId} with plan ${dto.planId}`);

    // 1. Fetch and validate plan from catalog-service
    const plan = await this.catalogClient.getPlanById(dto.planId);
    this.logger.debug(`Fetched plan: ${plan.name}`);

    // 2. Fetch and validate image from catalog-service
    const image = await this.catalogClient.getImageById(dto.imageId);
    this.logger.debug(`Fetched image: ${image.displayName}`);

    // 3. Get pricing for the requested duration
    const pricing = this.getPricingForDuration(plan, dto.duration);
    if (!pricing) {
      throw new InvalidDurationException(dto.duration);
    }

    // 4. Calculate promo discount (from active promos)
    const promoDiscount = this.calculatePromoDiscount(plan, pricing.price);

    // 5. Calculate base price after promo
    const priceAfterPromo = pricing.price - promoDiscount;

    // 6. Validate coupon if provided (via catalog-service)
    let couponDiscount = 0;
    let finalPrice = priceAfterPromo;

    if (dto.couponCode) {
      this.logger.debug(`Validating coupon: ${dto.couponCode}`);
      const couponResult = await this.catalogClient.validateCoupon({
        code: dto.couponCode,
        planId: dto.planId,
        userId: userId,
        amount: priceAfterPromo,
      });

      // Coupon validation succeeded (would throw if invalid)
      couponDiscount = couponResult.discountAmount || 0;
      finalPrice = couponResult.finalPrice || (priceAfterPromo - couponDiscount);
    }

    // Ensure finalPrice is not negative
    finalPrice = Math.max(0, finalPrice);

    this.logger.debug(`Pricing snapshot: base=${pricing.price}, promo=-${promoDiscount}, coupon=-${couponDiscount}, final=${finalPrice}`);

    // 7. Create order with transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
          planId: dto.planId,
          planName: plan.displayName || plan.name,
          imageId: dto.imageId,
          imageName: image.displayName,
          duration: dto.duration,
          basePrice: Math.round(pricing.price),
          promoDiscount: Math.round(promoDiscount),
          couponCode: dto.couponCode || null,
          couponDiscount: Math.round(couponDiscount),
          finalPrice: Math.round(finalPrice),
          currency: 'IDR',
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      // Create order item for the plan
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          itemType: ItemType.PLAN,
          referenceId: dto.planId,
          description: `${plan.displayName || plan.name} - ${plan.cpu} vCPU, ${plan.memoryMb}MB RAM, ${plan.diskGb}GB SSD`,
          unitPrice: Math.round(pricing.price),
          quantity: 1,
          totalPrice: Math.round(pricing.price),
        },
      });

      // Record initial status history
      await tx.statusHistory.create({
        data: {
          orderId: newOrder.id,
          previousStatus: '',
          newStatus: OrderStatus.PENDING_PAYMENT,
          actor: `user:${userId}`,
          reason: 'Order created',
          metadata: {
            planId: dto.planId,
            imageId: dto.imageId,
            duration: dto.duration,
            couponCode: dto.couponCode || null,
          },
        },
      });

      return newOrder;
    });

    // Fetch full order with relations
    return this.getOrderById(order.id);
  }

  /**
   * Get order by ID with optional ownership check
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        provisioningTask: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    // Ownership check if userId provided
    if (userId && order.userId !== userId) {
      throw new OrderAccessDeniedException(orderId);
    }

    return order as OrderWithRelations;
  }

  /**
   * Get orders by user ID with pagination and filtering
   */
  async getOrdersByUserId(
    userId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResult<OrderWithRelations>> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          provisioningTask: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders as OrderWithRelations[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all orders (admin view) with pagination and filtering
   * No ownership check - admin can see all orders
   */
  async getAllOrders(
    query: AdminPaginationQueryDto
  ): Promise<PaginatedResult<OrderWithRelations>> {
    const { page = 1, limit = 10, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(userId && { userId }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          provisioningTask: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders as OrderWithRelations[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order by ID for admin (no ownership check)
   * Includes full details: items, provisioningTask, statusHistory
   */
  async getOrderByIdAdmin(orderId: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        provisioningTask: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    return order as OrderWithRelations;
  }

  /**
   * Update order status with state machine validation
   * This is the centralized method for all status updates
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actor: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    const currentStatus = order.status;

    // Validate transition using state machine
    if (!OrderStateMachine.isValidTransition(currentStatus, newStatus)) {
      this.logger.warn(
        `Invalid status transition attempted: ${currentStatus} -> ${newStatus} for order ${orderId}`
      );
      throw new PaymentStatusConflictException(currentStatus, newStatus);
    }

    // Update order status in transaction
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // Update the order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          // Set paidAt timestamp when transitioning to PAID
          ...(newStatus === OrderStatus.PAID && { paidAt: new Date() }),
        },
      });

      // Record status history
      await tx.statusHistory.create({
        data: {
          orderId,
          previousStatus: currentStatus,
          newStatus,
          actor,
          reason: reason || OrderStateMachine.getTransitionDescription(currentStatus, newStatus),
          metadata: metadata || null,
        },
      });

      return updated;
    });

    this.logger.log(
      `Order ${orderId} status updated: ${currentStatus} -> ${newStatus} by ${actor}`
    );

    return updatedOrder;
  }

  /**
   * Record a status history entry (for external audit purposes)
   */
  async recordStatusHistory(
    orderId: string,
    previousStatus: string,
    newStatus: string,
    actor: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.statusHistory.create({
      data: {
        orderId,
        previousStatus,
        newStatus,
        actor,
        reason: reason || null,
        metadata: metadata || null,
      },
    });
  }

  /**
   * Get all orders (admin) with pagination and filtering
   */
  async getAllOrders(
    query: PaginationQueryDto & { userId?: string }
  ): Promise<PaginatedResult<OrderWithRelations>> {
    const { page = 1, limit = 10, status, userId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      ...(status && { status }),
      ...(userId && { userId }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          provisioningTask: true,
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders as OrderWithRelations[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get pricing for a specific duration from plan
   * @private
   */
  private getPricingForDuration(
    plan: CatalogPlan,
    duration: PlanDuration
  ): { price: number; cost: number } | null {
    // Map our PlanDuration enum to catalog's duration
    const durationMap: Record<PlanDuration, string> = {
      [PlanDuration.MONTHLY]: 'MONTHLY',
      [PlanDuration.QUARTERLY]: 'QUARTERLY',
      [PlanDuration.SEMI_ANNUAL]: 'SEMI_ANNUAL',
      [PlanDuration.ANNUAL]: 'YEARLY', // Catalog uses YEARLY
    };

    const catalogDuration = durationMap[duration];
    const pricing = plan.pricings.find(
      (p) => p.duration === catalogDuration && p.isActive
    );

    if (!pricing) {
      // Fallback: try MONTHLY if requested duration not available
      if (duration !== PlanDuration.MONTHLY) {
        this.logger.warn(
          `Pricing for ${duration} not found, falling back to MONTHLY`
        );
        return this.getPricingForDuration(plan, PlanDuration.MONTHLY);
      }
      return null;
    }

    return { price: pricing.price, cost: pricing.cost };
  }

  /**
   * Calculate promo discount from active promos
   * @private
   */
  private calculatePromoDiscount(plan: CatalogPlan, basePrice: number): number {
    const now = new Date();
    const activePromos = plan.promos.filter(
      (p) =>
        p.isActive &&
        new Date(p.startDate) <= now &&
        new Date(p.endDate) >= now
    );

    if (activePromos.length === 0) {
      return 0;
    }

    // Apply the first active promo (could be enhanced to stack or pick best)
    const promo = activePromos[0];
    if (promo.discountType === 'PERCENT') {
      return Math.round(basePrice * (promo.discountValue / 100));
    }
    return promo.discountValue;
  }
}
