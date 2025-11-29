import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

import { ListInvoicesQueryDto } from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

/**
 * Admin Invoice Controller - Internal Admin API
 * 
 * Base path: /api/v1/internal/invoices
 * Authentication: X-API-Key header required + Admin role check (if JWT present)
 * 
 * Security: Uses both ApiKeyGuard and AdminRoleGuard for defense-in-depth.
 * - ApiKeyGuard validates the X-API-Key header
 * - AdminRoleGuard validates admin role if Authorization header is present
 */
@Controller('api/v1/internal/invoices')
@UseGuards(ApiKeyGuard, AdminRoleGuard)
export class AdminInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * GET /api/v1/internal/invoices
   * Get all invoices (admin)
   */
  @Get()
  async getAllInvoices(@Query() query: ListInvoicesQueryDto) {
    const result = await this.invoiceService.getAllInvoices(query);
    return { data: result.data, meta: result.meta };
  }

  /**
   * GET /api/v1/internal/invoices/:id
   * Get invoice by ID (admin - no ownership check)
   */
  @Get(':id')
  async getInvoiceById(@Param('id') id: string) {
    const invoice = await this.invoiceService.getInvoiceById(id);
    return { data: invoice };
  }
}
