import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse, AxiosError } from 'axios';
import { of, throwError } from 'rxjs';

import {
  InsufficientBalanceException,
  BillingServiceUnavailableException,
} from '../../common/exceptions';

import { BillingClientService } from './billing-client.service';

describe('BillingClientService', () => {
  let service: BillingClientService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<BillingClientService>(BillingClientService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Default config mock
    mockConfigService.get.mockReturnValue('test-api-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    const userId = 'user-123';

    it('should return user balance successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: { balance: 100000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const balance = await service.getBalance(userId);

      expect(balance).toBe(100000);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        `/internal/wallet/${userId}/balance`,
        { headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }) }
      );
    });

    it('should throw BillingServiceUnavailableException on connection refused', async () => {
      const axiosError = {
        response: null,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      } as AxiosError;

      mockHttpService.get.mockReturnValue(throwError(() => axiosError));

      await expect(service.getBalance(userId)).rejects.toThrow(
        BillingServiceUnavailableException
      );
    });
  });

  describe('checkSufficientBalance', () => {
    const userId = 'user-123';

    it('should return true when balance is sufficient', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: { balance: 100000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.checkSufficientBalance(userId, 50000);

      expect(result).toBe(true);
    });

    it('should return false when balance is insufficient', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: { balance: 30000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.checkSufficientBalance(userId, 50000);

      expect(result).toBe(false);
    });

    it('should return true when balance equals required amount', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: { balance: 50000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.checkSufficientBalance(userId, 50000);

      expect(result).toBe(true);
    });
  });

  describe('deductBalance', () => {
    const userId = 'user-123';
    const amount = 50000;
    const referenceType = 'VPS_ORDER';
    const referenceId = 'order-123';
    const description = 'Test order';

    it('should deduct balance successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true, data: { transactionId: 'tx-123', newBalance: 50000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await expect(
        service.deductBalance(userId, amount, referenceType, referenceId, description)
      ).resolves.not.toThrow();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `/internal/wallet/${userId}/deduct`,
        { amount, referenceType, referenceId, description },
        { headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }) }
      );
    });

    it('should throw InsufficientBalanceException when balance is insufficient', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { code: 'INSUFFICIENT_BALANCE', details: { requiredAmount: 50000 } },
        },
        code: '',
        message: 'Insufficient balance',
      } as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(
        service.deductBalance(userId, amount, referenceType, referenceId, description)
      ).rejects.toThrow(InsufficientBalanceException);
    });
  });

  describe('refundBalance', () => {
    const userId = 'user-123';
    const amount = 50000;
    const referenceType = 'PROVISION_FAILED_REFUND';
    const referenceId = 'order-123';
    const description = 'Refund for failed provisioning';

    it('should refund balance successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true, data: { transactionId: 'tx-124', newBalance: 150000 } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await expect(
        service.refundBalance(userId, amount, referenceType, referenceId, description)
      ).resolves.not.toThrow();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        `/internal/wallet/${userId}/credit`,
        { amount, referenceType, referenceId, description },
        { headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }) }
      );
    });

    it('should throw BillingServiceUnavailableException on timeout', async () => {
      const axiosError = {
        response: null,
        code: 'ETIMEDOUT',
        message: 'Connection timed out',
      } as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      await expect(
        service.refundBalance(userId, amount, referenceType, referenceId, description)
      ).rejects.toThrow(BillingServiceUnavailableException);
    });
  });
});
