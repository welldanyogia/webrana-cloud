import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios, { AxiosError } from 'axios';

import { OrderServiceUnavailableException } from '../../common/exceptions';

import { OrderClientService, Order, ProvisioningTask } from './order-client.service';

// Mock axios
jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    ...actualAxios,
    create: jest.fn().mockReturnValue({
      get: jest.fn(),
    }),
  };
});

describe('OrderClientService', () => {
  let service: OrderClientService;
  let mockAxiosInstance: jest.Mocked<ReturnType<typeof axios.create>>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        ORDER_SERVICE_URL: 'http://localhost:3003',
        INTERNAL_API_KEY: 'test-api-key',
        ORDER_SERVICE_TIMEOUT_MS: 5000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockProvisioningTask: ProvisioningTask = {
    id: 'task-uuid',
    status: 'COMPLETED',
    dropletId: '12345678',
    dropletName: 'vps-test-1234',
    dropletStatus: 'active',
    ipv4Public: '143.198.123.45',
    ipv4Private: '10.130.0.2',
    doRegion: 'sgp1',
    doSize: 's-1vcpu-1gb',
    doImage: 'ubuntu-22-04-x64',
    errorCode: null,
    errorMessage: null,
    startedAt: '2024-01-15T10:00:00Z',
    completedAt: '2024-01-15T10:02:00Z',
  };

  const mockOrder: Order = {
    id: 'order-uuid-123',
    userId: 'user-uuid-456',
    status: 'ACTIVE',
    basePrice: 100000,
    promoDiscount: 0,
    couponDiscount: 0,
    finalPrice: 100000,
    currency: 'IDR',
    paidAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    items: [
      {
        id: 'item-uuid-789',
        planId: 'plan-uuid',
        imageId: 'image-uuid',
        duration: 'MONTHLY',
        planSnapshot: {
          name: 'Basic 1GB',
          cpu: 1,
          ram: 1024,
          ssd: 25,
          bandwidth: 1000,
        },
        imageSnapshot: {
          name: 'Ubuntu 22.04',
          distribution: 'ubuntu',
        },
      },
    ],
    provisioningTask: mockProvisioningTask,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset axios mock
    mockAxiosInstance = {
      get: jest.fn(),
    } as any;

    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderClientService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OrderClientService>(OrderClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create axios client with correct configuration', () => {
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3003',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key',
        },
      });
    });
  });

  describe('getActiveOrdersByUserId', () => {
    it('should return active orders for user', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [mockOrder],
          meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
        },
      });

      const result = await service.getActiveOrdersByUserId('user-uuid-456');

      expect(result).toEqual([mockOrder]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/internal/orders',
        {
          params: {
            userId: 'user-uuid-456',
            status: 'ACTIVE',
            limit: 100,
          },
        }
      );
    });

    it('should return empty array when user has no orders', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          data: [],
          meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
        },
      });

      const result = await service.getActiveOrdersByUserId('user-no-orders');

      expect(result).toEqual([]);
    });

    it('should throw OrderServiceUnavailableException on connection refused', async () => {
      const error = new AxiosError(
        'Connection refused',
        'ECONNREFUSED'
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        service.getActiveOrdersByUserId('user-uuid-456')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should throw OrderServiceUnavailableException on timeout', async () => {
      const error = new AxiosError(
        'Timeout',
        'ETIMEDOUT'
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        service.getActiveOrdersByUserId('user-uuid-456')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should throw OrderServiceUnavailableException on 500 error', async () => {
      const error = new AxiosError(
        'Internal server error',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: { message: 'Internal server error' } },
          headers: {},
          config: {} as any,
        } as any
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        service.getActiveOrdersByUserId('user-uuid-456')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });
  });

  describe('getOrderById', () => {
    it('should return order by ID', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: mockOrder },
      });

      const result = await service.getOrderById('order-uuid-123');

      expect(result).toEqual(mockOrder);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/internal/orders/order-uuid-123'
      );
    });

    it('should return null when order not found (404)', async () => {
      const error = new AxiosError(
        'Order not found',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 404,
          statusText: 'Not Found',
          data: { error: { message: 'Order not found' } },
          headers: {},
          config: {} as any,
        } as any
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await service.getOrderById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw OrderServiceUnavailableException on connection refused', async () => {
      const error = new AxiosError(
        'Connection refused',
        'ECONNREFUSED'
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        service.getOrderById('order-uuid-123')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should throw OrderServiceUnavailableException on non-404 HTTP error', async () => {
      const error = new AxiosError(
        'Forbidden',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 403,
          statusText: 'Forbidden',
          data: { error: { message: 'Forbidden' } },
          headers: {},
          config: {} as any,
        } as any
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(
        service.getOrderById('order-uuid-123')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should include provisioning task data', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: mockOrder },
      });

      const result = await service.getOrderById('order-uuid-123');

      expect(result?.provisioningTask).toBeDefined();
      expect(result?.provisioningTask?.dropletId).toBe('12345678');
    });

    it('should handle orders without provisioning task', async () => {
      const orderWithoutTask = { ...mockOrder, provisioningTask: null };
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: orderWithoutTask },
      });

      const result = await service.getOrderById('order-uuid-123');

      expect(result?.provisioningTask).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockAxiosInstance.get.mockRejectedValue(unexpectedError);

      await expect(
        service.getActiveOrdersByUserId('user-uuid-456')
      ).rejects.toThrow(OrderServiceUnavailableException);
    });

    it('should include error details in exception', async () => {
      const error = new AxiosError(
        'Service temporarily unavailable',
        'ERR_BAD_RESPONSE',
        undefined,
        undefined,
        {
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: { message: 'Service temporarily unavailable' } },
          headers: {},
          config: {} as any,
        } as any
      );
      mockAxiosInstance.get.mockRejectedValue(error);

      try {
        await service.getActiveOrdersByUserId('user-uuid-456');
        fail('Should have thrown OrderServiceUnavailableException');
      } catch (err) {
        expect(err).toBeInstanceOf(OrderServiceUnavailableException);
      }
    });
  });

  describe('API key authentication', () => {
    it('should include X-API-Key header in all requests', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });
  });

  describe('Request timeout', () => {
    it('should use configured timeout', () => {
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 5000,
        })
      );
    });
  });
});
