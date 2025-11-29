import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import { CreateInvoiceDto } from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

/**
 * Internal Invoice Controller - Service-to-Service API
 * 
 * Base path: /api/v1/internal/billing
 * Authentication: X-API-Key header required
 * 
 * Used by order-service to create invoices after order creation
 */
@Controller('api/v1/internal/billing')
@UseGuards(ApiKeyGuard)
export class InternalInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * POST /api/v1/internal/billing/invoices
   * Create invoice for an order (called by order-service)
   */
  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    const invoice = await this.invoiceService.createInvoice(dto);
    return { data: invoice };
  }
}
