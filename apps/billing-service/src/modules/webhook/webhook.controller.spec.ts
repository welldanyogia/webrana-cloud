import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { TripaySignatureException } from '../../common/exceptions/billing.exceptions';
import { InvoiceService } from '../invoice/invoice.service';
import { TripayService } from '../tripay/tripay.service';
import { DepositService } from '../wallet/deposit.service';
import { TripayCallbackPayload } from '../tripay/dto/tripay.dto';

import { WebhookController } from './webhook.controller';

describe('WebhookController', () => {
  let controller: WebhookController;
  let invoiceService: jest.Mocked<InvoiceService>;
  let tripayService: jest.Mocked<TripayService>;
  let depositService: jest.Mocked<DepositService>;

  const mockInvoiceService = {
    processCallback: jest.fn(),
  };

  const mockTripayService = {
    verifyCallbackSignatureRaw: jest.fn(),
  };

  const mockDepositService = {
    processPaidDeposit: jest.fn(),
  };

  const validPayload: TripayCallbackPayload = {
    reference: 'T0001',
    merchant_ref: 'INV-20241129-ABC123',
    payment_method: 'BRIVA',
    payment_method_code: 'BRIVA',
    total_amount: 100000,
    fee_merchant: 2000,
    fee_customer: 0,
    total_fee: 2000,
    amount_received: 98000,
    is_closed_payment: 1,
    status: 'PAID',
    paid_at: Math.floor(Date.now() / 1000),
  };

  const validSignature = 'valid-hmac-sha256-signature';
  const validRawBody = JSON.stringify(validPayload);

  const createMockRequest = (rawBody: string | null) => ({
    rawBody: rawBody ? Buffer.from(rawBody, 'utf-8') : undefined,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        {
          provide: InvoiceService,
          useValue: mockInvoiceService,
        },
        {
          provide: TripayService,
          useValue: mockTripayService,
        },
        {
          provide: DepositService,
          useValue: mockDepositService,
        },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    invoiceService = module.get(InvoiceService);
    tripayService = module.get(TripayService);
    depositService = module.get(DepositService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleTripayCallback', () => {
    it('should process valid callback with correct signature', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const request = createMockRequest(validRawBody) as any;

      const result = await controller.handleTripayCallback(
        validPayload,
        validSignature,
        request
      );

      expect(result).toEqual({ success: true });
      expect(mockTripayService.verifyCallbackSignatureRaw).toHaveBeenCalledWith(
        validRawBody,
        validSignature
      );
      expect(mockInvoiceService.processCallback).toHaveBeenCalledWith(validPayload);
    });

    it('should throw BadRequestException when signature header is missing', async () => {
      const request = createMockRequest(validRawBody) as any;

      await expect(
        controller.handleTripayCallback(validPayload, '', request)
      ).rejects.toThrow(BadRequestException);

      expect(mockTripayService.verifyCallbackSignatureRaw).not.toHaveBeenCalled();
      expect(mockInvoiceService.processCallback).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when raw body is missing', async () => {
      const request = createMockRequest(null) as any;

      await expect(
        controller.handleTripayCallback(validPayload, validSignature, request)
      ).rejects.toThrow(BadRequestException);

      expect(mockInvoiceService.processCallback).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when signature is invalid', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockImplementation(() => {
        throw new TripaySignatureException();
      });

      const request = createMockRequest(validRawBody) as any;

      await expect(
        controller.handleTripayCallback(validPayload, 'invalid-signature', request)
      ).rejects.toThrow(BadRequestException);

      expect(mockInvoiceService.processCallback).not.toHaveBeenCalled();
    });

    it('should process PAID status callback', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const paidPayload: TripayCallbackPayload = {
        ...validPayload,
        status: 'PAID',
      };

      const request = createMockRequest(JSON.stringify(paidPayload)) as any;

      await controller.handleTripayCallback(paidPayload, validSignature, request);

      expect(mockInvoiceService.processCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAID' })
      );
    });

    it('should process EXPIRED status callback', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const expiredPayload: TripayCallbackPayload = {
        ...validPayload,
        status: 'EXPIRED',
        paid_at: undefined,
      };

      const request = createMockRequest(JSON.stringify(expiredPayload)) as any;

      await controller.handleTripayCallback(expiredPayload, validSignature, request);

      expect(mockInvoiceService.processCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'EXPIRED' })
      );
    });

    it('should process REFUND status callback', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const refundPayload: TripayCallbackPayload = {
        ...validPayload,
        status: 'REFUND',
        paid_at: undefined,
      };

      const request = createMockRequest(JSON.stringify(refundPayload)) as any;

      await controller.handleTripayCallback(refundPayload, validSignature, request);

      expect(mockInvoiceService.processCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REFUND' })
      );
    });

    it('should process FAILED status callback', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const failedPayload: TripayCallbackPayload = {
        ...validPayload,
        status: 'FAILED',
        paid_at: undefined,
      };

      const request = createMockRequest(JSON.stringify(failedPayload)) as any;

      await controller.handleTripayCallback(failedPayload, validSignature, request);

      expect(mockInvoiceService.processCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'FAILED' })
      );
    });

    it('should handle invoice processing error gracefully', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockRejectedValue(new Error('Processing error'));

      const request = createMockRequest(validRawBody) as any;

      // Depending on implementation, this might throw or handle gracefully
      // The current implementation will throw - adjust based on actual behavior
      await expect(
        controller.handleTripayCallback(validPayload, validSignature, request)
      ).rejects.toThrow();
    });

    it('should use raw body string for signature verification', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockReturnValue(undefined);
      mockInvoiceService.processCallback.mockResolvedValue(undefined);

      const testPayload = { ...validPayload, reference: 'T0001' };
      const rawBodyWithWhitespace = `  ${JSON.stringify(testPayload)}  `;
      const request = createMockRequest(rawBodyWithWhitespace) as any;

      await controller.handleTripayCallback(
        testPayload,
        validSignature,
        request
      );

      // Verify that raw body is used as-is for signature verification
      expect(mockTripayService.verifyCallbackSignatureRaw).toHaveBeenCalledWith(
        rawBodyWithWhitespace,
        validSignature
      );
    });
  });

  describe('Webhook Security', () => {
    it('should always verify signature before processing', async () => {
      let signatureVerified = false;
      let callbackProcessed = false;

      mockTripayService.verifyCallbackSignatureRaw.mockImplementation(() => {
        signatureVerified = true;
      });

      mockInvoiceService.processCallback.mockImplementation(() => {
        callbackProcessed = true;
        expect(signatureVerified).toBe(true);
        return Promise.resolve();
      });

      const request = createMockRequest(validRawBody) as any;

      await controller.handleTripayCallback(validPayload, validSignature, request);

      expect(signatureVerified).toBe(true);
      expect(callbackProcessed).toBe(true);
    });

    it('should not process callback when signature verification fails', async () => {
      mockTripayService.verifyCallbackSignatureRaw.mockImplementation(() => {
        throw new TripaySignatureException();
      });

      const request = createMockRequest(validRawBody) as any;

      await expect(
        controller.handleTripayCallback(validPayload, 'tampered-signature', request)
      ).rejects.toThrow();

      expect(mockInvoiceService.processCallback).not.toHaveBeenCalled();
    });
  });
});
