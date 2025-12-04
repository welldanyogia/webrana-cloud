import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

import {
  OrderNotFoundException,
  PaymentStatusConflictException,
} from '../../common/exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { ProvisioningService } from '../provisioning/provisioning.service';

import { UpdatePaymentStatusDto, PaymentStatusUpdate } from './dto';
import { OrderService } from './order.service';

export interface PaymentStatusResult {
  id: string;
  status: OrderStatus;
  paidAt: Date | null;
  previousStatus: string;
}

/**
 * Payment Service - Mock Payment Override for v1
 * 
 * This service handles admin/internal payment status updates.
 * Real payment gateway integration is out of scope for v1.
 * 
 * Valid transitions:
 * - PENDING_PAYMENT -> PAID (triggers provisioning)
 * - PENDING_PAYMENT -> PAYMENT_FAILED (see note below)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPORTANT: PAYMENT_FAILED Behavior (v1 Design Decision)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * "PAYMENT_FAILED" is treated as a PAYMENT EVENT, NOT an OrderStatus transition.
 * 
 * When admin marks payment as PAYMENT_FAILED:
 * - Order.status remains PENDING_PAYMENT (tidak berubah)
 * - Event dicatat di StatusHistory dengan newStatus = 'PAYMENT_FAILED'
 * - User/admin masih bisa retry payment di kemudian hari
 * 
 * Rationale:
 * - Memungkinkan retry payment tanpa harus buat order baru
 * - PAYMENT_FAILED bukan terminal state, hanya event pembayaran gagal
 * - Jika di masa depan diputuskan "payment failed = order FAILED permanen",
 *   behavior ini akan direvisi di PRD v1.1 atau v2
 * 
 * Ref: PRD Section 4.3 (FR8) - Payment Override API
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly provisioningService: ProvisioningService
  ) {}

  /**
   * Update payment status for an order
   * 
   * This is the admin/internal endpoint for mock payment.
   * Only allows transitions from PENDING_PAYMENT.
   * 
   * After PAID status:
   * - Automatically triggers ProvisioningService.startProvisioning()
   */
  async updatePaymentStatus(
    orderId: string,
    dto: UpdatePaymentStatusDto,
    actor: string
  ): Promise<PaymentStatusResult> {
    this.logger.log(
      `Updating payment status for order ${orderId} to ${dto.status} by ${actor}`
    );

    // Get current order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    // Validate current status is PENDING_PAYMENT
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      this.logger.warn(
        `Invalid payment status update attempted for order ${orderId}. Current status: ${order.status}`
      );
      throw new PaymentStatusConflictException(order.status, dto.status);
    }

    const previousStatus = order.status;

    if (dto.status === PaymentStatusUpdate.PAID) {
      // Mark as PAID
      const updatedOrder = await this.orderService.updateOrderStatus(
        orderId,
        OrderStatus.PAID,
        actor,
        dto.notes || 'Payment verified via admin override',
        { paymentMethod: 'manual_override' }
      );

      this.logger.log(`Order ${orderId} marked as PAID`);

      // Trigger provisioning (non-blocking)
      // Using setImmediate to not block the response
      setImmediate(async () => {
        try {
          await this.provisioningService.startProvisioning(orderId);
        } catch (error) {
          this.logger.error(
            `Failed to start provisioning for order ${orderId}:`,
            error
          );
          // Provisioning failure is handled in ProvisioningService
          // Order status will be updated to FAILED there if needed
        }
      });

      return {
        id: updatedOrder.id,
        status: updatedOrder.status,
        paidAt: updatedOrder.paidAt,
        previousStatus,
      };
    } else if (dto.status === PaymentStatusUpdate.PAYMENT_FAILED) {
      // ═══════════════════════════════════════════════════════════════════════
      // PAYMENT_FAILED: Event-based, NOT status transition (v1 design decision)
      // ═══════════════════════════════════════════════════════════════════════
      // - Order.status tetap PENDING_PAYMENT (tidak berubah)
      // - Hanya dicatat di StatusHistory sebagai event
      // - Memungkinkan retry payment tanpa buat order baru
      // - Jika ingin payment failed = order FAILED, revisi di PRD v1.1
      // ═══════════════════════════════════════════════════════════════════════
      await this.orderService.recordStatusHistory(
        orderId,
        previousStatus,
        'PAYMENT_FAILED', // Payment event, bukan OrderStatus
        actor,
        dto.notes || 'Payment failed',
        { paymentMethod: 'manual_override' }
      );

      this.logger.log(
        `Payment failed recorded for order ${orderId}. Order status remains PENDING_PAYMENT (retry allowed).`
      );

      return {
        id: order.id,
        status: order.status, // Tetap PENDING_PAYMENT, bukan FAILED
        paidAt: null,
        previousStatus,
      };
    }

    // Should never reach here due to DTO validation
    throw new PaymentStatusConflictException(order.status, dto.status);
  }

  /**
   * Check if an order can accept payment update
   */
  async canUpdatePaymentStatus(orderId: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    return order?.status === OrderStatus.PENDING_PAYMENT;
  }
}
