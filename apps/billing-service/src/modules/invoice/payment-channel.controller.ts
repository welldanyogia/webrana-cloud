import { Controller, Get } from '@nestjs/common';

import { InvoiceService } from './invoice.service';

/**
 * Payment Channel Controller - Public API
 * 
 * Base path: /api/v1/payment-channels
 * Authentication: None (public)
 */
@Controller('api/v1/payment-channels')
export class PaymentChannelController {
  constructor(private readonly invoiceService: InvoiceService) {}

  /**
   * GET /api/v1/payment-channels
   * Get available payment channels
   */
  @Get()
  async getPaymentChannels() {
    const channels = await this.invoiceService.getPaymentChannels();
    return { data: channels };
  }
}
