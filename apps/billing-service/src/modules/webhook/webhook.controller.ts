import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';

import { InvoiceService } from '../invoice/invoice.service';
import { TripayCallbackPayload } from '../tripay/dto/tripay.dto';
import { TripayService } from '../tripay/tripay.service';
import { DepositService } from '../wallet/deposit.service';

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
    private readonly tripayService: TripayService,
    private readonly depositService: DepositService
  ) {}

  /**
   * POST /api/v1/webhooks/tripay
   * Process payment callback from Tripay
   * 
   * Tripay sends:
   * - X-Callback-Signature: HMAC-SHA256 signature of request body
   * - Request body: TripayCallbackPayload
   * 
   * Security: Uses raw body for signature verification to ensure
   * exact byte-for-byte match with the signed payload.
   */
  @Post('tripay')
  @HttpCode(HttpStatus.OK)
  async handleTripayCallback(
    @Body() payload: TripayCallbackPayload,
    @Headers('x-callback-signature') signature: string,
    @Req() request: RawBodyRequest<Request>
  ) {
    this.logger.log(
      `Received Tripay callback for merchant_ref: ${payload.merchant_ref}`
    );

    // Verify signature
    if (!signature) {
      this.logger.warn('Missing X-Callback-Signature header');
      throw new BadRequestException('Missing callback signature');
    }

    // Get raw body for accurate signature verification
    const rawBody = request.rawBody?.toString('utf-8');
    
    if (!rawBody) {
      this.logger.error('Raw body not available - check rawBody is enabled in main.ts');
      throw new BadRequestException('Missing request body');
    }

    try {
      // Verify signature using raw body to avoid JSON serialization differences
      this.tripayService.verifyCallbackSignatureRaw(rawBody, signature);
    } catch (error) {
      this.logger.warn('Invalid callback signature');
      throw new BadRequestException('Invalid callback signature');
    }

    // Determine if this is a deposit or invoice callback
    // Deposits have merchant_ref starting with "DEP-"
    const isDepositCallback = payload.merchant_ref.startsWith('DEP-');

    if (isDepositCallback) {
      // Process deposit callback
      this.logger.log(`Processing deposit callback for ref: ${payload.reference}`);
      
      if (payload.status === 'PAID') {
        await this.depositService.processPaidDeposit(payload.reference);
      } else {
        this.logger.log(`Deposit callback status: ${payload.status} - no action taken`);
      }
    } else {
      // Process invoice callback (existing logic)
      await this.invoiceService.processCallback(payload);
    }

    // Tripay expects { success: true } response
    return { success: true };
  }
}
