import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import { InvoiceService } from '../invoice/invoice.service';
import { TripayCallbackPayload } from '../tripay/dto/tripay.dto';
import { TripayService } from '../tripay/tripay.service';

/**
 * Webhook Controller - Payment Provider Callbacks
 * 
 * Base path: /api/v1/webhooks
 * Authentication: Signature verification (provider-specific)
 */
@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly tripayService: TripayService
  ) {}

  /**
   * POST /api/v1/webhooks/tripay
   * Process payment callback from Tripay
   * 
   * Tripay sends:
   * - X-Callback-Signature: HMAC-SHA256 signature of request body
   * - Request body: TripayCallbackPayload
   */
  @Post('tripay')
  @HttpCode(HttpStatus.OK)
  async handleTripayCallback(
    @Body() payload: TripayCallbackPayload,
    @Headers('x-callback-signature') signature: string
  ) {
    this.logger.log(
      `Received Tripay callback for merchant_ref: ${payload.merchant_ref}`
    );

    // Verify signature
    if (!signature) {
      this.logger.warn('Missing X-Callback-Signature header');
      throw new BadRequestException('Missing callback signature');
    }

    try {
      this.tripayService.validateCallback(payload, signature);
    } catch (error) {
      this.logger.warn('Invalid callback signature');
      throw new BadRequestException('Invalid callback signature');
    }

    // Process the callback
    await this.invoiceService.processCallback(payload);

    // Tripay expects { success: true } response
    return { success: true };
  }
}
