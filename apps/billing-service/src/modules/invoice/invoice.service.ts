import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice, InvoiceStatus, PaymentChannel, PaymentMethod, Prisma } from '@prisma/client';

import {
  InvoiceNotFoundException,
  InvoiceAlreadyExistsException,
  InvoiceAccessDeniedException,
  InvoiceExpiredException,
  InvoiceAlreadyPaidException,
  InvalidInvoiceStatusException,
  TripayChannelNotFoundException,
} from '../../common/exceptions/billing.exceptions';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderClientService } from '../order-client/order-client.service';
import { TripayCallbackPayload, TripayPaymentChannel } from '../tripay/dto/tripay.dto';
import { TripayService } from '../tripay/tripay.service';

import {
  CreateInvoiceDto,
  InitiatePaymentDto,
  InvoiceResponseDto,
  InvoiceListResponseDto,
  PaymentInitiatedResponseDto,
  PaymentChannelResponseDto,
  ListInvoicesQueryDto,
} from './dto/invoice.dto';


@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly invoiceExpiryHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tripayService: TripayService,
    private readonly orderClientService: OrderClientService,
    private readonly configService: ConfigService
  ) {
    this.invoiceExpiryHours = this.configService.get<number>(
      'INVOICE_EXPIRY_HOURS',
      24
    );
  }

  /**
   * Generate unique invoice number
   * Format: INV-YYYYMMDD-XXXXXX
   */
  private generateInvoiceNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `INV-${dateStr}-${random}`;
  }

  /**
   * Map Tripay channel code to Prisma enum
   */
  private mapPaymentChannel(code: string): PaymentChannel | null {
    const mapping: Record<string, PaymentChannel> = {
      BRIVA: 'BRI_VA',
      BCAVA: 'BCA_VA',
      BNIVA: 'BNI_VA',
      MANDIRIVA: 'MANDIRI_VA',
      PERMATAVA: 'PERMATA_VA',
      BSIVA: 'BSI_VA',
      CIMBVA: 'CIMB_VA',
      MUAMALATVA: 'MUAMALAT_VA',
      OVO: 'OVO',
      QRIS: 'QRIS',
      QRISC: 'QRISC',
      DANA: 'DANA',
      SHOPEEPAY: 'SHOPEEPAY',
      LINKAJA: 'LINKAJA',
      ALFAMART: 'ALFAMART',
      INDOMARET: 'INDOMARET',
      ALFAMIDI: 'ALFAMIDI',
    };
    return mapping[code] || null;
  }

  /**
   * Map payment channel to method
   */
  private getPaymentMethod(channel: TripayPaymentChannel): PaymentMethod {
    switch (channel.type) {
      case 'virtual_account':
        return 'VIRTUAL_ACCOUNT';
      case 'ewallet':
        return 'EWALLET';
      case 'qris':
        return 'QRIS';
      case 'convenience_store':
        return 'CONVENIENCE_STORE';
      default:
        return 'VIRTUAL_ACCOUNT';
    }
  }

  /**
   * Map Invoice to response DTO
   */
  private toResponseDto(invoice: Invoice): InvoiceResponseDto {
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      paymentMethod: invoice.paymentMethod ?? undefined,
      paymentChannel: invoice.paymentChannel ?? undefined,
      paymentCode: invoice.paymentCode ?? undefined,
      paymentUrl: invoice.paymentUrl ?? undefined,
      paymentName: invoice.paymentName ?? undefined,
      paymentFee: invoice.paymentFee ?? undefined,
      tripayReference: invoice.tripayReference ?? undefined,
      expiredAt: invoice.expiredAt.toISOString(),
      paidAt: invoice.paidAt?.toISOString(),
      paidAmount: invoice.paidAmount ?? undefined,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  /**
   * Create a new invoice for an order
   */
  async createInvoice(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    this.logger.log(`Creating invoice for order: ${dto.orderId}`);

    // Check if invoice already exists for this order
    const existingInvoice = await this.prisma.invoice.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingInvoice) {
      throw new InvoiceAlreadyExistsException(dto.orderId);
    }

    // Generate invoice number and expiry
    const invoiceNumber = this.generateInvoiceNumber();
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + this.invoiceExpiryHours);

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId: dto.orderId,
        userId: dto.userId,
        invoiceNumber,
        amount: dto.amount,
        expiredAt,
      },
    });

    this.logger.log(`Invoice created: ${invoiceNumber} for order ${dto.orderId}`);

    return this.toResponseDto(invoice);
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId: string, userId?: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new InvoiceNotFoundException(invoiceId);
    }

    // If userId provided, check ownership
    if (userId && invoice.userId !== userId) {
      throw new InvoiceAccessDeniedException(invoiceId);
    }

    return this.toResponseDto(invoice);
  }

  /**
   * Get invoice by order ID
   */
  async getInvoiceByOrderId(orderId: string, userId?: string): Promise<InvoiceResponseDto | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
    });

    if (!invoice) {
      return null;
    }

    // If userId provided, check ownership
    if (userId && invoice.userId !== userId) {
      throw new InvoiceAccessDeniedException(invoice.id);
    }

    return this.toResponseDto(invoice);
  }

  /**
   * Get invoices by user ID with pagination
   */
  async getInvoicesByUserId(
    userId: string,
    query: ListInvoicesQueryDto
  ): Promise<InvoiceListResponseDto> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { userId };
    if (status) {
      where.status = status as InvoiceStatus;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.toResponseDto(inv)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get available payment channels
   */
  async getPaymentChannels(): Promise<PaymentChannelResponseDto[]> {
    const channels = await this.tripayService.getPaymentChannels();

    return channels.map((ch) => ({
      code: ch.code,
      name: ch.name,
      group: ch.group,
      type: ch.type,
      fee: {
        flat: ch.total_fee.flat,
        percent: ch.total_fee.percent,
      },
      iconUrl: ch.icon_url,
    }));
  }

  /**
   * Initiate payment for an invoice
   */
  async initiatePayment(
    invoiceId: string,
    dto: InitiatePaymentDto,
    userId?: string
  ): Promise<PaymentInitiatedResponseDto> {
    this.logger.log(`Initiating payment for invoice: ${invoiceId}, channel: ${dto.channel}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new InvoiceNotFoundException(invoiceId);
    }

    // Check ownership
    if (userId && invoice.userId !== userId) {
      throw new InvoiceAccessDeniedException(invoiceId);
    }

    // Check status
    if (invoice.status === 'PAID') {
      throw new InvoiceAlreadyPaidException(invoiceId);
    }

    if (invoice.status === 'EXPIRED') {
      throw new InvoiceExpiredException(invoiceId);
    }

    if (invoice.status !== 'PENDING') {
      throw new InvalidInvoiceStatusException(invoiceId, invoice.status, 'PENDING');
    }

    // Check expiry
    if (new Date() > invoice.expiredAt) {
      await this.expireInvoice(invoiceId);
      throw new InvoiceExpiredException(invoiceId);
    }

    // Get payment channels and validate
    const channels = await this.tripayService.getPaymentChannels();
    const selectedChannel = channels.find((ch) => ch.code === dto.channel);

    if (!selectedChannel) {
      throw new TripayChannelNotFoundException(dto.channel);
    }

    // Create Tripay transaction
    const expiredTime = Math.floor(invoice.expiredAt.getTime() / 1000);
    
    const transaction = await this.tripayService.createTransaction({
      method: dto.channel,
      merchantRef: invoice.invoiceNumber,
      amount: invoice.amount,
      customerName: dto.customerName || 'Customer',
      customerEmail: dto.customerEmail || 'customer@example.com',
      customerPhone: dto.customerPhone,
      orderItems: [
        {
          name: `Invoice ${invoice.invoiceNumber}`,
          price: invoice.amount,
          quantity: 1,
        },
      ],
      returnUrl: dto.returnUrl,
      expiredTime,
    });

    // Update invoice with payment details
    const paymentChannel = this.mapPaymentChannel(dto.channel);
    const paymentMethod = this.getPaymentMethod(selectedChannel);
    const paymentFee = this.tripayService.calculateFee(selectedChannel, invoice.amount);

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentMethod,
        paymentChannel,
        paymentCode: transaction.pay_code,
        paymentUrl: transaction.checkout_url,
        paymentName: transaction.payment_name,
        paymentFee,
        tripayReference: transaction.reference,
      },
    });

    this.logger.log(
      `Payment initiated for invoice ${invoiceId}. Tripay ref: ${transaction.reference}`
    );

    return {
      invoice: this.toResponseDto(updatedInvoice),
      payment: {
        channel: dto.channel,
        channelName: transaction.payment_name,
        paymentCode: transaction.pay_code,
        paymentUrl: transaction.checkout_url,
        totalAmount: invoice.amount + paymentFee,
        fee: paymentFee,
        expiredAt: invoice.expiredAt.toISOString(),
        instructions: transaction.instructions,
      },
    };
  }

  /**
   * Process callback from Tripay
   */
  async processCallback(payload: TripayCallbackPayload): Promise<void> {
    this.logger.log(
      `Processing callback for merchant_ref: ${payload.merchant_ref}, status: ${payload.status}`
    );

    // Find invoice by invoice number (merchant_ref)
    const invoice = await this.prisma.invoice.findUnique({
      where: { invoiceNumber: payload.merchant_ref },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found for merchant_ref: ${payload.merchant_ref}`);
      return;
    }

    // Skip if already processed
    if (invoice.status === 'PAID' || invoice.status === 'EXPIRED') {
      this.logger.log(`Invoice ${invoice.id} already in final status: ${invoice.status}`);
      return;
    }

    // Record payment attempt
    await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: payload.total_amount,
        channel: payload.payment_method_code,
        reference: payload.reference,
        status: payload.status,
        rawPayload: payload as Prisma.InputJsonValue,
      },
    });

    if (payload.status === 'PAID') {
      // Update invoice to PAID
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAt: payload.paid_at ? new Date(payload.paid_at * 1000) : new Date(),
          paidAmount: payload.amount_received,
          paidChannel: payload.payment_method_code,
          callbackPayload: payload as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Invoice ${invoice.id} marked as PAID`);

      // Notify order-service
      try {
        await this.orderClientService.updatePaymentStatus(
          invoice.orderId,
          'PAID',
          payload.reference
        );
        this.logger.log(`Order ${invoice.orderId} payment status updated to PAID`);
      } catch (error) {
        this.logger.error(
          `Failed to update order ${invoice.orderId} payment status: ${error}`
        );
        // Don't throw - invoice is already marked as paid
      }
    } else if (payload.status === 'EXPIRED') {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: 'EXPIRED',
          callbackPayload: payload as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Invoice ${invoice.id} marked as EXPIRED`);
    } else if (payload.status === 'FAILED' || payload.status === 'REFUND') {
      this.logger.log(
        `Invoice ${invoice.id} payment ${payload.status}: ${payload.note || 'No details'}`
      );
      // Just log, don't change status
    }
  }

  /**
   * Mark invoice as expired
   */
  async expireInvoice(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new InvoiceNotFoundException(invoiceId);
    }

    if (invoice.status !== 'PENDING') {
      return; // Only expire pending invoices
    }

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'EXPIRED' },
    });

    this.logger.log(`Invoice ${invoiceId} marked as EXPIRED`);
  }

  /**
   * Get all invoices (admin)
   */
  async getAllInvoices(query: ListInvoicesQueryDto): Promise<InvoiceListResponseDto> {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};
    if (status) {
      where.status = status as InvoiceStatus;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.toResponseDto(inv)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
