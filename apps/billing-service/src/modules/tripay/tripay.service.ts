import { createHmac } from 'crypto';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';


import {
  TripayApiException,
  TripaySignatureException,
} from '../../common/exceptions/billing.exceptions';

import {
  CreateTripayTransactionDto,
  TripayApiResponse,
  TripayPaymentChannel,
  TripayTransaction,
  TripayCallbackPayload,
} from './dto/tripay.dto';

@Injectable()
export class TripayService {
  private readonly logger = new Logger(TripayService.name);
  private readonly apiKey: string;
  private readonly privateKey: string;
  private readonly merchantCode: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.apiKey = this.configService.get<string>('TRIPAY_API_KEY', '');
    this.privateKey = this.configService.get<string>('TRIPAY_PRIVATE_KEY', '');
    this.merchantCode = this.configService.get<string>('TRIPAY_MERCHANT_CODE', '');

    if (!this.apiKey || !this.privateKey || !this.merchantCode) {
      this.logger.warn(
        'Tripay credentials not fully configured. Some features may not work.'
      );
    }
  }

  /**
   * Get all available payment channels from Tripay
   */
  async getPaymentChannels(): Promise<TripayPaymentChannel[]> {
    try {
      this.logger.log('Fetching payment channels from Tripay');
      
      const response = await firstValueFrom(
        this.httpService.get<TripayApiResponse<TripayPaymentChannel[]>>(
          '/merchant/payment-channel',
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        )
      );

      if (!response.data.success) {
        throw new TripayApiException(response.data.message);
      }

      // Filter only active channels
      const activeChannels = response.data.data.filter((channel) => channel.active);
      this.logger.log(`Retrieved ${activeChannels.length} active payment channels`);
      
      return activeChannels;
    } catch (error) {
      this.handleApiError(error, 'getPaymentChannels');
      throw error;
    }
  }

  /**
   * Create a closed payment transaction on Tripay
   */
  async createTransaction(dto: CreateTripayTransactionDto): Promise<TripayTransaction> {
    try {
      this.logger.log(`Creating transaction for merchant_ref: ${dto.merchantRef}`);

      // Generate signature for the transaction
      const signature = this.generateSignature({
        merchantRef: dto.merchantRef,
        amount: dto.amount,
      });

      const payload = {
        method: dto.method,
        merchant_ref: dto.merchantRef,
        amount: dto.amount,
        customer_name: dto.customerName,
        customer_email: dto.customerEmail,
        customer_phone: dto.customerPhone || '',
        order_items: dto.orderItems.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku,
          product_url: item.productUrl,
          image_url: item.imageUrl,
        })),
        callback_url: dto.callbackUrl,
        return_url: dto.returnUrl,
        expired_time: dto.expiredTime,
        signature,
      };

      const response = await firstValueFrom(
        this.httpService.post<TripayApiResponse<TripayTransaction>>(
          '/transaction/create',
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        )
      );

      if (!response.data.success) {
        throw new TripayApiException(response.data.message, {
          merchantRef: dto.merchantRef,
        });
      }

      this.logger.log(
        `Transaction created successfully. Reference: ${response.data.data.reference}`
      );

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'createTransaction');
      throw error;
    }
  }

  /**
   * Get transaction detail by Tripay reference
   */
  async getTransactionDetail(reference: string): Promise<TripayTransaction> {
    try {
      this.logger.log(`Fetching transaction detail for reference: ${reference}`);

      const response = await firstValueFrom(
        this.httpService.get<TripayApiResponse<TripayTransaction>>(
          '/transaction/detail',
          {
            params: { reference },
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
            },
          }
        )
      );

      if (!response.data.success) {
        throw new TripayApiException(response.data.message, { reference });
      }

      return response.data.data;
    } catch (error) {
      this.handleApiError(error, 'getTransactionDetail');
      throw error;
    }
  }

  /**
   * Generate HMAC-SHA256 signature for transaction creation
   * 
   * Signature format: HMAC-SHA256(merchantCode + merchantRef + amount, privateKey)
   */
  generateSignature(params: { merchantRef: string; amount: number }): string {
    const signatureString = `${this.merchantCode}${params.merchantRef}${params.amount}`;
    
    const signature = createHmac('sha256', this.privateKey)
      .update(signatureString)
      .digest('hex');

    this.logger.debug(`Generated signature for merchantRef: ${params.merchantRef}`);
    
    return signature;
  }

  /**
   * Verify callback signature from Tripay webhook
   * 
   * Callback signature format: HMAC-SHA256(json_payload, privateKey)
   */
  verifyCallbackSignature(payload: TripayCallbackPayload, signature: string): boolean {
    if (!signature) {
      this.logger.warn('Empty signature provided for verification');
      return false;
    }

    // Tripay sends signature in X-Callback-Signature header
    // The signature is HMAC-SHA256 of the raw JSON body
    const expectedSignature = createHmac('sha256', this.privateKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    const isValid = signature === expectedSignature;

    if (!isValid) {
      this.logger.warn('Callback signature verification failed');
    }

    return isValid;
  }

  /**
   * Validate and extract callback payload
   * Throws TripaySignatureException if signature is invalid
   * 
   * @deprecated Use verifyCallbackSignatureRaw for accurate verification
   */
  validateCallback(payload: TripayCallbackPayload, signature: string): TripayCallbackPayload {
    if (!this.verifyCallbackSignature(payload, signature)) {
      throw new TripaySignatureException();
    }
    return payload;
  }

  /**
   * Verify callback signature using raw body string
   * 
   * This is the preferred method as it uses the exact raw body bytes
   * sent by Tripay, avoiding JSON serialization differences that can
   * occur with key ordering or whitespace.
   * 
   * @throws TripaySignatureException if signature is invalid or missing
   */
  verifyCallbackSignatureRaw(rawBody: string, signature: string): void {
    if (!signature) {
      this.logger.warn('Empty signature provided for verification');
      throw new TripaySignatureException();
    }

    const expectedSignature = createHmac('sha256', this.privateKey)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.warn('Callback signature verification failed (raw body)');
      throw new TripaySignatureException();
    }

    this.logger.debug('Callback signature verified successfully');
  }

  /**
   * Calculate total fee for a payment channel and amount
   */
  calculateFee(channel: TripayPaymentChannel, amount: number): number {
    const flatFee = channel.total_fee.flat;
    const percentFee = Math.round((amount * channel.total_fee.percent) / 100);
    let totalFee = flatFee + percentFee;

    // Apply min/max fee limits
    if (channel.minimum_fee && totalFee < channel.minimum_fee) {
      totalFee = channel.minimum_fee;
    }
    if (channel.maximum_fee && totalFee > channel.maximum_fee) {
      totalFee = channel.maximum_fee;
    }

    return totalFee;
  }

  /**
   * Handle API errors and convert to appropriate exceptions
   */
  private handleApiError(error: unknown, operation: string): void {
    if (error instanceof TripayApiException) {
      throw error;
    }

    const axiosError = error as { response?: { data?: unknown; status?: number }; message?: string };
    
    if (axiosError.response) {
      this.logger.error(
        `Tripay API error in ${operation}: ${JSON.stringify(axiosError.response.data)}`
      );
      throw new TripayApiException(
        `Tripay API error: ${axiosError.response.status}`,
        { operation, details: axiosError.response.data }
      );
    }

    this.logger.error(
      `Tripay request error in ${operation}: ${axiosError.message || 'Unknown error'}`
    );
    throw new TripayApiException(
      axiosError.message || 'Failed to communicate with Tripay',
      { operation }
    );
  }
}
