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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import {
  InitiatePaymentDto,
  ListInvoicesQueryDto,
} from './dto/invoice.dto';
import { InvoiceService } from './invoice.service';

@ApiTags('Invoices')
@ApiBearerAuth('bearer')
@Controller('api/v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'List user invoices', description: 'Get all invoices for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyInvoices(
    @CurrentUser('userId') userId: string,
    @Query() query: ListInvoicesQueryDto
  ) {
    const result = await this.invoiceService.getInvoicesByUserId(userId, query);
    return { data: result.data, meta: result.meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID', description: 'Get invoice details by invoice ID' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string
  ) {
    const invoice = await this.invoiceService.getInvoiceById(id, userId);
    return { data: invoice };
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get invoice by order ID', description: 'Get invoice details by associated order ID' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceByOrderId(
    @Param('orderId') orderId: string,
    @CurrentUser('userId') userId: string
  ) {
    const invoice = await this.invoiceService.getInvoiceByOrderId(orderId, userId);
    return { data: invoice };
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate payment', description: 'Start payment process for an invoice using selected payment channel' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment channel or invoice already paid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async initiatePayment(
    @Param('id') id: string,
    @Body() dto: InitiatePaymentDto,
    @CurrentUser('userId') userId: string
  ) {
    const result = await this.invoiceService.initiatePayment(id, dto, userId);
    return { data: result };
  }
}
