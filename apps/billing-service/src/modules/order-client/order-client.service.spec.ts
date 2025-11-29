import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse, AxiosError } from 'axios';
import { of, throwError } from 'rxjs';

import {
  OrderServiceUnavailableException,
  OrderNotFoundException,
} from '../../common/exceptions/billing.exceptions';

import { OrderClientService } from './order-client.service';

describe('OrderClientService', () => {
  let service: OrderClientService;
  let httpService: HttpService;

  const mockConfig = {
    ORDER_SERVICE_URL: 'http://localhost:3003',
    ORDER_SERVICE_TIMEOUT_MS: 5000,
    INTERNAL_API_KEY: 'test-api-key',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderClientService,
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
            get: jest.fn((key: string, defaultValue?: any) => {
              return mockConfig[key as keyof typeof mockConfig] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OrderClientService>(OrderClientService);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
  });

  describe('updatePaymentStatus', () => {
    const orderId = 'order-uuid-1';
    const mockOrderResponse = {
      id: orderId,
      userId: 'user-uuid-1',
      status: 'PAID',
      finalPrice: 100000,
    };

    it('should update payment status to PAID successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: mockOrderResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.updatePaymentStatus(orderId, 'PAID', 'T0001');

      expect(result).toEqual(mockOrderResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        `/api/v1/internal/orders/${orderId}/payment-status`,
        expect.objectContaining({
          status: 'PAID',
          reference: 'T0001',
        }),
        expect.objectContaining({
          headers: { 'X-API-Key': mockConfig.INTERNAL_API_KEY },
        })
      );
    });

    it('should update payment status to FAILED', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: { ...mockOrderResponse, status: 'FAILED' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.updatePaymentStatus(orderId, 'FAILED');

      expect(result.status).toBe('FAILED');
      expect(httpService.post).toHaveBeenCalledWith(
        `/api/v1/internal/orders/${orderId}/payment-status`,
        expect.objectContaining({
          status: 'FAILED',
          paidAt: undefined,
        }),
        expect.any(Object)
      );
    });

    it('should throw OrderNotFoundException on 404', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { error: { code: 'ORDER_NOT_FOUND' } },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => axiosError));

      await expect(
        service.updatePaymentStatus(orderId, 'PAID')
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should throw OrderServiceUnavailableException on server error', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { error: { code: 'INTERNAL_SERVER_ERROR' } },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => axiosError));

      await expect(
        service.updatePaymentStatus(orderId, 'PAID')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should throw OrderServiceUnavailableException on connection refused', async () => {
      const axiosError = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => axiosError));

      await expect(
        service.updatePaymentStatus(orderId, 'PAID')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should retry on server errors', async () => {
      const axiosError = {
        response: {
          status: 503,
          data: { error: { code: 'SERVICE_UNAVAILABLE' } },
        },
        isAxiosError: true,
      } as AxiosError;

      const mockResponse: AxiosResponse = {
        data: { data: mockOrderResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail first 2 times, succeed on 3rd
      jest.spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => axiosError))
        .mockReturnValueOnce(throwError(() => axiosError))
        .mockReturnValueOnce(of(mockResponse));

      const result = await service.updatePaymentStatus(orderId, 'PAID');

      expect(result).toEqual(mockOrderResponse);
      expect(httpService.post).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should not retry on 4xx client errors', async () => {
      const axiosError = {
        response: {
          status: 400,
          data: { error: { code: 'BAD_REQUEST' } },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => axiosError));

      await expect(
        service.updatePaymentStatus(orderId, 'PAID')
      ).rejects.toThrow(OrderServiceUnavailableException);

      expect(httpService.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrder', () => {
    const orderId = 'order-uuid-1';
    const mockOrderResponse = {
      id: orderId,
      userId: 'user-uuid-1',
      status: 'PENDING_PAYMENT',
      finalPrice: 100000,
    };

    it('should get order successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { data: mockOrderResponse },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.getOrder(orderId);

      expect(result).toEqual(mockOrderResponse);
      expect(httpService.get).toHaveBeenCalledWith(
        `/api/v1/internal/orders/${orderId}`,
        expect.objectContaining({
          headers: { 'X-API-Key': mockConfig.INTERNAL_API_KEY },
        })
      );
    });

    it('should return null on 404', async () => {
      const axiosError = {
        response: {
          status: 404,
          data: { error: { code: 'ORDER_NOT_FOUND' } },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => axiosError));

      const result = await service.getOrder(orderId);

      expect(result).toBeNull();
    });

    it('should throw OrderServiceUnavailableException on server error', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { error: { code: 'INTERNAL_SERVER_ERROR' } },
        },
        isAxiosError: true,
      } as AxiosError;

      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => axiosError));

      await expect(service.getOrder(orderId)).rejects.toThrow(
        OrderServiceUnavailableException
      );
    });
  });
});
