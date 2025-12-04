import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { of, throwError } from 'rxjs';

import {
  CatalogServiceUnavailableException,
  InvalidPlanException,
  InvalidImageException,
  InvalidCouponException,
} from '../../common/exceptions';

import { CatalogClientService, CatalogPlan, CatalogImage } from './catalog-client.service';

describe('CatalogClientService', () => {
  let service: CatalogClientService;
  let httpService: HttpService;

  const mockPlan: CatalogPlan = {
    id: 'plan-123',
    name: 'vps-basic',
    displayName: 'VPS Basic',
    description: 'Basic VPS plan',
    cpu: 1,
    memoryMb: 1024,
    diskGb: 25,
    bandwidthTb: 1,
    provider: 'digitalocean',
    providerSizeSlug: 's-1vcpu-1gb',
    isActive: true,
    sortOrder: 1,
    tags: [],
    pricings: [
      {
        id: 'pricing-1',
        duration: 'MONTHLY',
        price: 150000,
        cost: 100000,
        isActive: true,
      },
    ],
    promos: [],
  };

  const mockImage: CatalogImage = {
    id: 'image-123',
    provider: 'digitalocean',
    providerSlug: 'ubuntu-22-04-x64',
    displayName: 'Ubuntu 22.04 LTS',
    description: 'Ubuntu 22.04 x64',
    category: 'OS',
    version: '22.04',
    isActive: true,
    sortOrder: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogClientService,
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CatalogClientService>(CatalogClientService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlanById', () => {
    it('should return plan when found and active', async () => {
      const response: AxiosResponse = {
        data: { data: mockPlan },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getPlanById('plan-123');

      expect(result).toEqual(mockPlan);
      expect(httpService.get).toHaveBeenCalledWith('/api/v1/catalog/plans/plan-123');
    });

    it('should throw InvalidPlanException when plan is inactive', async () => {
      const inactivePlan = { ...mockPlan, isActive: false };
      const response: AxiosResponse = {
        data: { data: inactivePlan },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      await expect(service.getPlanById('plan-123')).rejects.toThrow(InvalidPlanException);
    });

    it('should throw CatalogServiceUnavailableException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(service.getPlanById('plan-123')).rejects.toThrow(
        CatalogServiceUnavailableException
      );
    });
  });

  describe('getImageById', () => {
    it('should return image when found and active', async () => {
      const response: AxiosResponse = {
        data: { data: mockImage },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      const result = await service.getImageById('image-123');

      expect(result).toEqual(mockImage);
      expect(httpService.get).toHaveBeenCalledWith('/api/v1/catalog/images/image-123');
    });

    it('should throw InvalidImageException when image is inactive', async () => {
      const inactiveImage = { ...mockImage, isActive: false };
      const response: AxiosResponse = {
        data: { data: inactiveImage },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'get').mockReturnValue(of(response));

      await expect(service.getImageById('image-123')).rejects.toThrow(InvalidImageException);
    });

    it('should throw CatalogServiceUnavailableException on timeout', async () => {
      const error = new AxiosError('Timeout');
      error.code = 'ETIMEDOUT';
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => error));

      await expect(service.getImageById('image-123')).rejects.toThrow(
        CatalogServiceUnavailableException
      );
    });
  });

  describe('validateCoupon', () => {
    it('should return validation result when coupon is valid', async () => {
      const validationResult = {
        valid: true,
        discountAmount: 30000,
        finalPrice: 120000,
        coupon: {
          code: 'HEMAT20',
          name: 'Diskon 20%',
          discountType: 'PERCENT' as const,
          discountValue: 20,
        },
      };
      const response: AxiosResponse = {
        data: { data: validationResult },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'post').mockReturnValue(of(response));

      const result = await service.validateCoupon({
        code: 'HEMAT20',
        planId: 'plan-123',
        userId: 'user-123',
        amount: 150000,
      });

      expect(result).toEqual(validationResult);
      expect(httpService.post).toHaveBeenCalledWith('/api/v1/catalog/coupons/validate', {
        code: 'HEMAT20',
        planId: 'plan-123',
        userId: 'user-123',
        amount: 150000,
      });
    });

    it('should throw InvalidCouponException when coupon is invalid', async () => {
      const invalidResult = {
        valid: false,
        reason: 'EXPIRED',
      };
      const response: AxiosResponse = {
        data: { data: invalidResult },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      jest.spyOn(httpService, 'post').mockReturnValue(of(response));

      await expect(
        service.validateCoupon({
          code: 'EXPIRED_CODE',
          amount: 150000,
        })
      ).rejects.toThrow(InvalidCouponException);
    });

    it('should throw CatalogServiceUnavailableException on connection error', async () => {
      const error = new AxiosError('Connection refused');
      error.code = 'ECONNREFUSED';
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => error));

      await expect(
        service.validateCoupon({
          code: 'TEST',
          amount: 150000,
        })
      ).rejects.toThrow(CatalogServiceUnavailableException);
    });
  });
});
