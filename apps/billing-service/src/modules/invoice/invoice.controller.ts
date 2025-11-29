import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  InitiatePaymentDto,
  ListInvoicesQueryDto,
} from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

/**
 * Invoice Controller - User API Endpoints
 * 
 * Base path: /api/v1/invoices
 * Authentication: JWT Bearer token required
 */
@Controller('api/v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * GET /api/v1/invoices
   * Get all invoices for current user
   */
  @Get()
  async getMyInvoices(
    @CurrentUser('userId') userId: string,
    @Query() query: ListInvoicesQueryDto
  ) {
    const result = await this.invoiceService.getInvoicesByUserId(userId, query);
    return { data: result.data, meta: result.meta };
  }

  /**
   * GET /api/v1/invoices/:id
   * Get invoice detail by ID
   */
  @Get(':id')
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id, userId);
    return { data: invoice };
  }

  /**
   * GET /api/v1/invoices/order/:orderId
   * Get invoice by order ID
   */
  @Get('order/:orderId')
  async getInvoiceByOrderId(
    @Param('orderId') orderId: string,
    @CurrentUser('userId') userId: string
  ) {
    const invoice = await this.invoiceService.getInvoiceByOrderId(orderId, userId);
    return { data: invoice };
  }

  /**
   * POST /api/v1/invoices/:id/pay
   * Initiate payment for an invoice
   */
  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @Param('id') id: string,
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('userId') userId: string
  ) {
    const result = await this.invoiceService.initiatePayment(id, dto, userId);
    return { data: result };
  }
}
