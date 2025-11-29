import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';

import {
  TripayApiException,
  TripaySignatureException,
} from '../../common/exceptions/billing.exceptions';

import {
  TripayPaymentChannel,
  TripayTransaction,
  TripayCallbackPayload,
} from './dto/tripay.dto';
import { TripayService } from './tripay.service';

describe('TripayService', () => {
  let service: TripayService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockConfig = {
    TRIPAY_API_KEY: 'test-api-key',
    TRIPAY_PRIVATE_KEY: 'test-private-key',
    TRIPAY_MERCHANT_CODE: 'T12345',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripayService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              return mockConfig[key as keyof typeof mockConfig] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TripayService>(TripayService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateSignature', () => {
    it('should generate valid HMAC-SHA256 signature', () => {
      const params = {
        merchantRef: 'INV-20241129-ABC123',
        amount: 100000,
      };

      const signature = service.generateSignature(params);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex digest length
    });

    it('should generate consistent signatures for same input', () => {
      const params = {
        merchantRef: 'INV-20241129-ABC123',
        amount: 100000,
      };

      const signature1 = service.generateSignature(params);
      const signature2 = service.generateSignature(params);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different amounts', () => {
      const params1 = {
        merchantRef: 'INV-20241129-ABC123',
        amount: 100000,
      };
      const params2 = {
        merchantRef: 'INV-20241129-ABC123',
        amount: 200000,
      };

      const signature1 = service.generateSignature(params1);
      const signature2 = service.generateSignature(params2);

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different merchant refs', () => {
      const params1 = {
        merchantRef: 'INV-001',
        amount: 100000,
      };
      const params2 = {
        merchantRef: 'INV-002',
        amount: 100000,
      };

      const signature1 = service.generateSignature(params1);
      const signature2 = service.generateSignature(params2);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifyCallbackSignature', () => {
    it('should return true for valid signature', () => {
      const payload: TripayCallbackPayload = {
        reference: 'T0001',
        merchant_ref: 'INV-001',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: 1732900000,
      };

      // Generate valid signature
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', mockConfig.TRIPAY_PRIVATE_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');

      const isValid = service.verifyCallbackSignature(payload, validSignature);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload: TripayCallbackPayload = {
        reference: 'T0001',
        merchant_ref: 'INV-001',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        is_closed_payment: 1,
        status: 'PAID',
      };

      const isValid = service.verifyCallbackSignature(payload, 'invalid-signature');

      expect(isValid).toBe(false);
    });

    it('should return false for empty signature', () => {
      const payload: TripayCallbackPayload = {
        reference: 'T0001',
        merchant_ref: 'INV-001',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        is_closed_payment: 1,
        status: 'PAID',
      };

      const isValid = service.verifyCallbackSignature(payload, '');

      expect(isValid).toBe(false);
    });
  });

  describe('validateCallback', () => {
    it('should return payload for valid signature', () => {
      const payload: TripayCallbackPayload = {
        reference: 'T0001',
        merchant_ref: 'INV-001',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        is_closed_payment: 1,
        status: 'PAID',
      };

      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', mockConfig.TRIPAY_PRIVATE_KEY)
        .update(JSON.stringify(payload))
        .digest('hex');

      const result = service.validateCallback(payload, validSignature);

      expect(result).toEqual(payload);
    });

    it('should throw TripaySignatureException for invalid signature', () => {
      const payload: TripayCallbackPayload = {
        reference: 'T0001',
        merchant_ref: 'INV-001',
        payment_method: 'BRIVA',
        payment_method_code: 'BRIVA',
        total_amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        is_closed_payment: 1,
        status: 'PAID',
      };

      expect(() => service.validateCallback(payload, 'invalid')).toThrow(
        TripaySignatureException
      );
    });
  });

  describe('getPaymentChannels', () => {
    it('should return active payment channels', async () => {
      const mockChannels: TripayPaymentChannel[] = [
        {
          group: 'Virtual Account',
          code: 'BRIVA',
          name: 'BRI Virtual Account',
          type: 'virtual_account',
          fee_merchant: { flat: 2000, percent: 0 },
          fee_customer: { flat: 0, percent: 0 },
          total_fee: { flat: 2000, percent: 0 },
          minimum_fee: 2000,
          maximum_fee: 2000,
          icon_url: 'https://tripay.co.id/images/briva.png',
          active: true,
        },
        {
          group: 'E-Wallet',
          code: 'OVO',
          name: 'OVO',
          type: 'ewallet',
          fee_merchant: { flat: 0, percent: 2 },
          fee_customer: { flat: 0, percent: 0 },
          total_fee: { flat: 0, percent: 2 },
          minimum_fee: 500,
          maximum_fee: 0,
          icon_url: 'https://tripay.co.id/images/ovo.png',
          active: true,
        },
        {
          group: 'Virtual Account',
          code: 'BCAVA',
          name: 'BCA Virtual Account',
          type: 'virtual_account',
          fee_merchant: { flat: 4000, percent: 0 },
          fee_customer: { flat: 0, percent: 0 },
          total_fee: { flat: 4000, percent: 0 },
          minimum_fee: 4000,
          maximum_fee: 4000,
          icon_url: 'https://tripay.co.id/images/bca.png',
          active: false, // Inactive channel
        },
      ];

      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          message: 'Success',
          data: mockChannels,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.getPaymentChannels();

      expect(result).toHaveLength(2); // Only active channels
      expect(result[0].code).toBe('BRIVA');
      expect(result[1].code).toBe('OVO');
    });

    it('should throw TripayApiException on API error', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          success: false,
          message: 'Invalid API key',
          data: null,
        },
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      await expect(service.getPaymentChannels()).rejects.toThrow(TripayApiException);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const dto = {
        method: 'BRIVA',
        merchantRef: 'INV-20241129-ABC123',
        amount: 100000,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        orderItems: [
          {
            name: 'VPS Basic Plan',
            price: 100000,
            quantity: 1,
          },
        ],
      };

      const mockTransaction: TripayTransaction = {
        reference: 'T0001',
        merchant_ref: dto.merchantRef,
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_name: 'BRI Virtual Account',
        customer_name: dto.customerName,
        customer_email: dto.customerEmail,
        customer_phone: '',
        callback_url: '',
        return_url: '',
        amount: dto.amount,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        pay_code: '8077800001234567',
        pay_url: 'https://tripay.co.id/checkout/T0001',
        checkout_url: 'https://tripay.co.id/checkout/T0001',
        status: 'UNPAID',
        expired_time: 1732986400,
        order_items: dto.orderItems,
        instructions: [],
      };

      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          message: 'Success',
          data: mockTransaction,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.createTransaction(dto);

      expect(result.reference).toBe('T0001');
      expect(result.merchant_ref).toBe(dto.merchantRef);
      expect(result.amount).toBe(dto.amount);
    });

    it('should throw TripayApiException on failure', async () => {
      const dto = {
        method: 'BRIVA',
        merchantRef: 'INV-20241129-ABC123',
        amount: 100000,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        orderItems: [],
      };

      const mockResponse: AxiosResponse = {
        data: {
          success: false,
          message: 'Order items cannot be empty',
          data: null,
        },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      await expect(service.createTransaction(dto)).rejects.toThrow(TripayApiException);
    });
  });

  describe('getTransactionDetail', () => {
    it('should return transaction detail', async () => {
      const reference = 'T0001';
      const mockTransaction: TripayTransaction = {
        reference,
        merchant_ref: 'INV-001',
        payment_selection_type: 'static',
        payment_method: 'BRIVA',
        payment_name: 'BRI Virtual Account',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '',
        callback_url: '',
        return_url: '',
        amount: 100000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 98000,
        pay_code: '8077800001234567',
        pay_url: 'https://tripay.co.id/checkout/T0001',
        checkout_url: 'https://tripay.co.id/checkout/T0001',
        status: 'PAID',
        expired_time: 1732986400,
        order_items: [],
        instructions: [],
      };

      const mockResponse: AxiosResponse = {
        data: {
          success: true,
          message: 'Success',
          data: mockTransaction,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.getTransactionDetail(reference);

      expect(result.reference).toBe(reference);
      expect(result.status).toBe('PAID');
    });
  });

  describe('calculateFee', () => {
    it('should calculate flat fee correctly', () => {
      const channel: TripayPaymentChannel = {
        group: 'Virtual Account',
        code: 'BRIVA',
        name: 'BRI VA',
        type: 'virtual_account',
        fee_merchant: { flat: 2000, percent: 0 },
        fee_customer: { flat: 0, percent: 0 },
        total_fee: { flat: 2000, percent: 0 },
        minimum_fee: 2000,
        maximum_fee: 2000,
        icon_url: '',
        active: true,
      };

      const fee = service.calculateFee(channel, 100000);

      expect(fee).toBe(2000);
    });

    it('should calculate percent fee correctly', () => {
      const channel: TripayPaymentChannel = {
        group: 'E-Wallet',
        code: 'OVO',
        name: 'OVO',
        type: 'ewallet',
        fee_merchant: { flat: 0, percent: 2 },
        fee_customer: { flat: 0, percent: 0 },
        total_fee: { flat: 0, percent: 2 },
        minimum_fee: 500,
        maximum_fee: 0,
        icon_url: '',
        active: true,
      };

      const fee = service.calculateFee(channel, 100000);

      expect(fee).toBe(2000); // 2% of 100000
    });

    it('should apply minimum fee', () => {
      const channel: TripayPaymentChannel = {
        group: 'E-Wallet',
        code: 'OVO',
        name: 'OVO',
        type: 'ewallet',
        fee_merchant: { flat: 0, percent: 2 },
        fee_customer: { flat: 0, percent: 0 },
        total_fee: { flat: 0, percent: 2 },
        minimum_fee: 1000,
        maximum_fee: 0,
        icon_url: '',
        active: true,
      };

      const fee = service.calculateFee(channel, 10000);

      expect(fee).toBe(1000); // 2% of 10000 = 200, but minimum is 1000
    });

    it('should apply maximum fee', () => {
      const channel: TripayPaymentChannel = {
        group: 'E-Wallet',
        code: 'OVO',
        name: 'OVO',
        type: 'ewallet',
        fee_merchant: { flat: 0, percent: 2 },
        fee_customer: { flat: 0, percent: 0 },
        total_fee: { flat: 0, percent: 2 },
        minimum_fee: 0,
        maximum_fee: 5000,
        icon_url: '',
        active: true,
      };

      const fee = service.calculateFee(channel, 1000000);

      expect(fee).toBe(5000); // 2% of 1000000 = 20000, but maximum is 5000
    });
  });
});
