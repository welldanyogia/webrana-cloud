import { Injectable, Logger } from '@nestjs/common';
import {
  Order,
  OrderStatus,
  PlanDuration,
  BillingPeriod,
  ItemType,
  Prisma,
} from '@prisma/client';

import {
  OrderNotFoundException,
  OrderAccessDeniedException,
  InvalidDurationException,
  InvalidBillingPeriodException,
  PaymentStatusConflictException,
  InsufficientBalanceException,
  StateTransitionConflictException,
  OrderNotActiveException,
  DropletNotReadyException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingClientService } from '../billing-client/billing-client.service';
import {
  CatalogClientService,
  CatalogPlan,
  CatalogImage,
} from '../catalog-client/catalog-client.service';
import { DoAccountService } from '../do-account/do-account.service';

import {
  CreateOrderDto,
  PaginationQueryDto,
  AdminPaginationQueryDto,
  PaginatedResult,
} from './dto';
import { OrderStateMachine } from './order-state-machine';

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
    doSize: string | null;
    doImage: string | null;
    doAccountId: string | null;
    dropletStatus: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    startedAt: Date | null;
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
    private readonly catalogClient: CatalogClientService,
    private readonly billingClient: BillingClientService,
    private readonly doAccountService: DoAccountService,
  ) {}

  /**
   * Create a new order with balance-based payment
   * 
   * Flow (Balance-Based):
   * 1. Fetch plan from catalog-service, validate active
   * 2. Fetch image from catalog-service, validate available
   * 3. Get pricing for the requested billing period
   * 4. Calculate discounts (promo + coupon)
   * 5. CHECK USER BALANCE FIRST (must have sufficient balance)
   * 6. Create Order with status PENDING
   * 7. DEDUCT BALANCE (reserve)
   * 8. Update status to PROCESSING
   * 9. Start provisioning async
   * 
   * If balance deduction fails, order stays in PENDING/FAILED.
   * If provisioning fails, balance is REFUNDED.
   */
  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderWithRelations> {
    this.logger.log(`Creating order for user ${userId} with plan ${dto.planId}, billingPeriod ${dto.billingPeriod}`);

    // 1. Fetch and validate plan from catalog-service
    const plan = await this.catalogClient.getPlanById(dto.planId);
    this.logger.debug(`Fetched plan: ${plan.name}`);

    // 2. Fetch and validate image from catalog-service
    const image = await this.catalogClient.getImageById(dto.imageId);
    this.logger.debug(`Fetched image: ${image.displayName}`);

    // 3. Get pricing for the requested billing period
    const pricing = this.getPricingForBillingPeriod(plan, dto.billingPeriod);
    if (!pricing) {
      throw new InvalidBillingPeriodException(dto.billingPeriod, dto.planId);
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
    const roundedFinalPrice = Math.round(finalPrice);

    this.logger.debug(`Pricing snapshot: base=${pricing.price}, promo=-${promoDiscount}, coupon=-${couponDiscount}, final=${roundedFinalPrice}`);

    // 7. CHECK USER BALANCE FIRST (critical - must have sufficient balance)
    const hasSufficientBalance = await this.billingClient.checkSufficientBalance(
      userId,
      roundedFinalPrice
    );

    if (!hasSufficientBalance) {
      this.logger.warn(`User ${userId} has insufficient balance for order. Required: ${roundedFinalPrice}`);
      throw new InsufficientBalanceException(roundedFinalPrice);
    }

    // Get legacy duration from billing period for backward compatibility
    const legacyDuration = this.billingPeriodToLegacyDuration(dto.billingPeriod);

    // 8. Create order with transaction in PENDING status
    const order = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          userId,
          planId: dto.planId,
          planName: plan.displayName || plan.name,
          imageId: dto.imageId,
          imageName: image.displayName,
          duration: legacyDuration,
          billingPeriod: dto.billingPeriod,
          basePrice: Math.round(pricing.price),
          promoDiscount: Math.round(promoDiscount),
          couponCode: dto.couponCode || null,
          couponDiscount: Math.round(couponDiscount),
          finalPrice: roundedFinalPrice,
          currency: 'IDR',
          status: OrderStatus.PENDING,
          autoRenew: dto.autoRenew ?? true,
          version: 0,
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
          newStatus: OrderStatus.PENDING,
          actor: `user:${userId}`,
          reason: 'Order created with balance-based payment',
          metadata: {
            planId: dto.planId,
            imageId: dto.imageId,
            billingPeriod: dto.billingPeriod,
            couponCode: dto.couponCode || null,
            autoRenew: dto.autoRenew ?? true,
          },
        },
      });

      return newOrder;
    });

    this.logger.log(`Order ${order.id} created with status PENDING`);

    try {
      // 9. DEDUCT BALANCE (reserve) - This is the payment
      await this.billingClient.deductBalance(
        userId,
        roundedFinalPrice,
        'VPS_ORDER',
        order.id,
        `Order VPS: ${plan.displayName || plan.name} (${dto.billingPeriod})`
      );

      this.logger.log(`Balance deducted for order ${order.id}: ${roundedFinalPrice} IDR`);

      // 10. Update to PROCESSING status (balance deducted, ready for provisioning)
      await this.updateOrderStatusAtomic(
        order.id,
        OrderStatus.PENDING,
        OrderStatus.PROCESSING,
        { paidAt: new Date() }
      );

      this.logger.log(`Order ${order.id} updated to PROCESSING, starting async provisioning`);

      // 11. Start provisioning async (non-blocking)
      // Note: This triggers the provisioning service which will update status to PROVISIONING and then ACTIVE
      setImmediate(() => {
        this.startProvisioningAsync(order.id).catch((err) => {
          this.logger.error(`Failed to start async provisioning for order ${order.id}:`, err);
        });
      });

      // Return order with updated status
      return this.getOrderById(order.id);

    } catch (error) {
      // Balance deduction failed - mark order as FAILED
      this.logger.error(`Balance deduction failed for order ${order.id}:`, error);
      
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.FAILED },
      });

      await this.prisma.statusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.FAILED,
          actor: 'system',
          reason: 'Balance deduction failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });

      throw error;
    }
  }

  /**
   * Start provisioning asynchronously
   * This method is called after balance is deducted
   */
  private async startProvisioningAsync(orderId: string): Promise<void> {
    this.logger.log(`Starting async provisioning for order ${orderId}`);
    
    // The ProvisioningService will be called here
    // For now, we emit an event or call the provisioning service directly
    // This is handled by the ProvisioningModule which listens for PROCESSING orders
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

  // ========================================
  // NEW BALANCE-BASED FLOW METHODS
  // ========================================

  /**
   * Atomically update order status with race-condition safety
   * Uses optimistic locking with version field
   * 
   * @param orderId - The order ID
   * @param fromStatus - Expected current status
   * @param toStatus - New status to transition to
   * @param additionalData - Additional fields to update
   * @returns Updated order
   * @throws StateTransitionConflictException if current status doesn't match
   */
  async updateOrderStatusAtomic(
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    additionalData?: Partial<{
      activatedAt: Date;
      expiresAt: Date;
      suspendedAt: Date;
      terminatedAt: Date;
      paidAt: Date;
      terminationReason: string;
    }>
  ): Promise<Order> {
    // Use updateMany with status condition for atomic update
    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: fromStatus, // Only update if still in expected state
      },
      data: {
        status: toStatus,
        version: { increment: 1 },
        ...(additionalData || {}),
      },
    });

    if (result.count === 0) {
      this.logger.warn(
        `State transition conflict for order ${orderId}: expected ${fromStatus}, trying to set ${toStatus}`
      );
      throw new StateTransitionConflictException(orderId, fromStatus, toStatus);
    }

    // Record status history
    await this.prisma.statusHistory.create({
      data: {
        orderId,
        previousStatus: fromStatus,
        newStatus: toStatus,
        actor: 'system',
        reason: OrderStateMachine.getTransitionDescription(fromStatus, toStatus),
        metadata: additionalData || null,
      },
    });

    this.logger.log(`Order ${orderId} atomically updated: ${fromStatus} -> ${toStatus}`);

    return this.prisma.order.findUnique({ where: { id: orderId } }) as Promise<Order>;
  }

  /**
   * Get pricing for a specific billing period from plan
   * Maps BillingPeriod to catalog pricing
   * @private
   */
  private getPricingForBillingPeriod(
    plan: CatalogPlan,
    billingPeriod: BillingPeriod
  ): { price: number; cost: number } | null {
    // Map billing period to catalog's duration
    const periodMap: Record<BillingPeriod, string> = {
      [BillingPeriod.DAILY]: 'DAILY', // May not exist in catalog
      [BillingPeriod.MONTHLY]: 'MONTHLY',
      [BillingPeriod.YEARLY]: 'YEARLY',
    };

    const catalogDuration = periodMap[billingPeriod];
    const pricing = plan.pricings.find(
      (p) => p.duration === catalogDuration && p.isActive
    );

    if (!pricing) {
      // For DAILY, calculate from MONTHLY if not available
      if (billingPeriod === BillingPeriod.DAILY) {
        const monthlyPricing = plan.pricings.find(
          (p) => p.duration === 'MONTHLY' && p.isActive
        );
        if (monthlyPricing) {
          // Daily price = Monthly / 30 (with small markup)
          const dailyPrice = Math.ceil(monthlyPricing.price / 28);
          const dailyCost = Math.ceil(monthlyPricing.cost / 28);
          return { price: dailyPrice, cost: dailyCost };
        }
      }
      
      // Fallback: try MONTHLY if requested period not available
      if (billingPeriod !== BillingPeriod.MONTHLY) {
        this.logger.warn(
          `Pricing for ${billingPeriod} not found, falling back to MONTHLY`
        );
        return this.getPricingForBillingPeriod(plan, BillingPeriod.MONTHLY);
      }
      return null;
    }

    return { price: pricing.price, cost: pricing.cost };
  }

  /**
   * Convert BillingPeriod to legacy PlanDuration for backward compatibility
   * @private
   */
  private billingPeriodToLegacyDuration(billingPeriod: BillingPeriod): PlanDuration {
    switch (billingPeriod) {
      case BillingPeriod.DAILY:
        return PlanDuration.MONTHLY; // Closest approximation
      case BillingPeriod.MONTHLY:
        return PlanDuration.MONTHLY;
      case BillingPeriod.YEARLY:
        return PlanDuration.ANNUAL;
      default:
        return PlanDuration.MONTHLY;
    }
  }

  /**
   * Calculate expiry date based on activation date and billing period
   * @param activatedAt - The activation timestamp
   * @param billingPeriod - The billing period
   * @returns The expiry date
   */
  calculateExpiryDate(activatedAt: Date, billingPeriod: BillingPeriod): Date {
    const expiry = new Date(activatedAt);
    
    switch (billingPeriod) {
      case BillingPeriod.DAILY:
        expiry.setDate(expiry.getDate() + 1);
        break;
      case BillingPeriod.MONTHLY:
        expiry.setMonth(expiry.getMonth() + 1);
        break;
      case BillingPeriod.YEARLY:
        expiry.setFullYear(expiry.getFullYear() + 1);
        break;
    }
    
    return expiry;
  }

  /**
   * Handle provisioning failure with balance refund
   * Called when provisioning fails after balance was deducted
   * 
   * @param orderId - The failed order ID
   * @param reason - Reason for failure
   */
  async handleProvisioningFailed(orderId: string, reason: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      this.logger.error(`Cannot handle provisioning failure: order ${orderId} not found`);
      return;
    }

    this.logger.log(`Handling provisioning failure for order ${orderId}: ${reason}`);

    // Refund balance
    try {
      await this.billingClient.refundBalance(
        order.userId,
        order.finalPrice,
        'PROVISION_FAILED_REFUND',
        orderId,
        `Refund for failed provisioning: ${reason}`
      );

      this.logger.log(`Balance refunded for order ${orderId}: ${order.finalPrice} IDR`);
    } catch (refundError) {
      this.logger.error(
        `Failed to refund balance for order ${orderId}:`,
        refundError
      );
      // Continue to update order status even if refund fails
      // Manual intervention will be needed
    }

    // Update order status to FAILED
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FAILED,
        terminationReason: 'DO_ACCOUNT_ISSUE',
      },
    });

    // Record status history
    await this.prisma.statusHistory.create({
      data: {
        orderId,
        previousStatus: order.status,
        newStatus: OrderStatus.FAILED,
        actor: 'system',
        reason: `Provisioning failed: ${reason}`,
        metadata: {
          originalStatus: order.status,
          failureReason: reason,
          refunded: true,
        },
      },
    });

    this.logger.log(`Order ${orderId} marked as FAILED due to provisioning failure`);
  }

  /**
   * Handle provisioning success
   * Called when VPS is successfully provisioned
   * 
   * @param orderId - The successful order ID
   */
  async handleProvisioningSuccess(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      this.logger.error(`Cannot handle provisioning success: order ${orderId} not found`);
      return;
    }

    const now = new Date();
    const expiresAt = this.calculateExpiryDate(now, order.billingPeriod);

    this.logger.log(`Handling provisioning success for order ${orderId}, expires at ${expiresAt.toISOString()}`);

    await this.updateOrderStatusAtomic(
      orderId,
      OrderStatus.PROVISIONING,
      OrderStatus.ACTIVE,
      {
        activatedAt: now,
        expiresAt,
      }
    );

    this.logger.log(`Order ${orderId} is now ACTIVE, expires at ${expiresAt.toISOString()}`);
  }

  // ========================================
  // VPS CONSOLE & POWER CONTROL METHODS
  // ========================================

  /**
   * Get VNC console URL for a VPS
   * 
   * @param orderId - The order ID
   * @param userId - The user ID (for ownership verification)
   * @returns Console URL and expiry time
   */
  async getConsoleUrl(
    orderId: string,
    userId: string
  ): Promise<{ url: string; expiresAt: string }> {
    this.logger.log(`Getting console URL for order ${orderId} by user ${userId}`);

    // 1. Get order and verify ownership
    const order = await this.getOrderById(orderId, userId);

    // 2. Verify order is ACTIVE
    if (order.status !== OrderStatus.ACTIVE) {
      this.logger.warn(`Cannot get console for order ${orderId}: status is ${order.status}`);
      throw new OrderNotActiveException(orderId);
    }

    // 3. Get provisioning task with droplet info
    if (!order.provisioningTask?.dropletId || !order.provisioningTask?.doAccountId) {
      this.logger.warn(`Cannot get console for order ${orderId}: droplet not ready`);
      throw new DropletNotReadyException(orderId);
    }

    // 4. Get console URL from DigitalOcean
    const consoleUrl = await this.doAccountService.getDropletConsoleUrl(
      order.provisioningTask.doAccountId,
      order.provisioningTask.dropletId
    );

    this.logger.log(`Console URL obtained for order ${orderId}`);

    return consoleUrl;
  }

  /**
   * Perform power action on a VPS
   * 
   * @param orderId - The order ID
   * @param userId - The user ID (for ownership verification)
   * @param action - The power action to perform
   */
  async powerAction(
    orderId: string,
    userId: string,
    action: 'power_on' | 'power_off' | 'reboot'
  ): Promise<void> {
    this.logger.log(`Performing ${action} on order ${orderId} by user ${userId}`);

    // 1. Get order and verify ownership
    const order = await this.getOrderById(orderId, userId);

    // 2. Verify order is ACTIVE or SUSPENDED (suspended VPS can still be powered on)
    if (!['ACTIVE', 'SUSPENDED'].includes(order.status)) {
      this.logger.warn(`Cannot perform ${action} on order ${orderId}: status is ${order.status}`);
      throw new OrderNotActiveException(orderId);
    }

    // 3. Get provisioning task with droplet info
    if (!order.provisioningTask?.dropletId || !order.provisioningTask?.doAccountId) {
      this.logger.warn(`Cannot perform ${action} on order ${orderId}: droplet not ready`);
      throw new DropletNotReadyException(orderId);
    }

    // 4. Perform power action via DigitalOcean
    await this.doAccountService.performDropletPowerAction(
      order.provisioningTask.doAccountId,
      order.provisioningTask.dropletId,
      action
    );

    this.logger.log(`Power action ${action} completed for order ${orderId}`);
  }

  // ========================================
  // ADMIN RETRY PROVISIONING
  // ========================================

  /**
   * Retry provisioning for a failed order (admin action)
   * 
   * This method allows admin to manually retry provisioning for orders
   * that failed during the provisioning phase. It:
   * 1. Verifies the order is in FAILED status
   * 2. Verifies there's a failed provisioning task
   * 3. Resets the order to PROCESSING status
   * 4. Resets the provisioning task
   * 5. Triggers provisioning again
   * 
   * @param orderId - The order ID to retry
   * @param actor - The actor performing the retry (e.g., 'admin:user-id')
   * @returns Object with message and order details
   * @throws OrderNotFoundException if order doesn't exist
   * @throws BadRequestException if order is not in FAILED status
   */
  async retryProvisioning(
    orderId: string,
    actor: string = 'admin'
  ): Promise<{ message: string; orderId: string; newStatus: OrderStatus }> {
    this.logger.log(`Retrying provisioning for order ${orderId} by ${actor}`);

    // 1. Get order with provisioning task
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        provisioningTask: true,
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    // 2. Verify order is in FAILED status
    if (order.status !== OrderStatus.FAILED) {
      this.logger.warn(
        `Cannot retry provisioning for order ${orderId}: status is ${order.status}, expected FAILED`
      );
      throw new PaymentStatusConflictException(order.status, 'PROCESSING');
    }

    // 3. Verify there was a provisioning attempt (provisioningTask exists)
    if (!order.provisioningTask) {
      this.logger.warn(
        `Cannot retry provisioning for order ${orderId}: no provisioning task found`
      );
      throw new PaymentStatusConflictException(order.status, 'PROCESSING');
    }

    // 4. Reset order and provisioning task in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Reset order status to PROCESSING
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PROCESSING,
          version: { increment: 1 },
        },
      });

      // Reset provisioning task
      await tx.provisioningTask.update({
        where: { id: order.provisioningTask!.id },
        data: {
          status: 'PENDING',
          errorCode: null,
          errorMessage: null,
          dropletId: null,
          dropletName: null,
          dropletStatus: null,
          ipv4Public: null,
          ipv4Private: null,
          attempts: 0,
          startedAt: null,
          completedAt: null,
        },
      });

      // Record status history
      await tx.statusHistory.create({
        data: {
          orderId,
          previousStatus: OrderStatus.FAILED,
          newStatus: OrderStatus.PROCESSING,
          actor,
          reason: 'Admin triggered retry provisioning',
          metadata: {
            previousProvisioningError: order.provisioningTask?.errorMessage,
            previousProvisioningErrorCode: order.provisioningTask?.errorCode,
          },
        },
      });
    });

    this.logger.log(
      `Order ${orderId} reset to PROCESSING for retry provisioning by ${actor}`
    );

    // 5. Trigger provisioning asynchronously
    // Note: The provisioning service listens for PROCESSING orders
    // and will pick this up, or we can trigger it directly
    setImmediate(() => {
      this.startProvisioningAsync(orderId).catch((err) => {
        this.logger.error(`Failed to start retry provisioning for order ${orderId}:`, err);
      });
    });

    return {
      message: 'Provisioning retry initiated',
      orderId,
      newStatus: OrderStatus.PROCESSING,
    };
  }
}
