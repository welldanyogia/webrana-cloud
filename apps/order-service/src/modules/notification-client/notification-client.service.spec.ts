import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

import { NotificationClientService } from './notification-client.service';

describe('NotificationClientService', () => {
  let service: NotificationClientService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationClientService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NotificationClientService>(NotificationClientService);
    httpService = module.get<HttpService>(HttpService);

    // Default config mock
    mockConfigService.get.mockReturnValue('test-api-key');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    const mockPayload = {
      userId: 'user-123',
      event: 'VPS_EXPIRING_SOON' as const,
      data: {
        orderId: 'order-456',
        planName: 'Basic VPS',
        expiresAt: '2024-01-15T00:00:00Z',
        hoursRemaining: 24,
        autoRenew: false,
      },
    };

    it('should send notification successfully', async () => {
      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await expect(service.send(mockPayload)).resolves.not.toThrow();

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/internal/notifications/send',
        {
          event: mockPayload.event,
          userId: mockPayload.userId,
          data: mockPayload.data,
        },
        { headers: expect.objectContaining({ 'X-API-Key': 'test-api-key' }) }
      );
    });

    it('should NOT throw on notification service unavailable (fire-and-forget)', async () => {
      const axiosError = {
        response: null,
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      } as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      // Fire-and-forget: should NOT throw
      await expect(service.send(mockPayload)).resolves.not.toThrow();
    });

    it('should NOT throw on notification service timeout (fire-and-forget)', async () => {
      const axiosError = {
        response: null,
        code: 'ETIMEDOUT',
        message: 'Connection timed out',
      } as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      // Fire-and-forget: should NOT throw
      await expect(service.send(mockPayload)).resolves.not.toThrow();
    });

    it('should NOT throw on notification service error response (fire-and-forget)', async () => {
      const axiosError = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
        code: '',
        message: 'Internal server error',
      } as AxiosError;

      mockHttpService.post.mockReturnValue(throwError(() => axiosError));

      // Fire-and-forget: should NOT throw
      await expect(service.send(mockPayload)).resolves.not.toThrow();
    });

    it('should send VPS_SUSPENDED notification correctly', async () => {
      const suspendPayload = {
        userId: 'user-123',
        event: 'VPS_SUSPENDED' as const,
        data: {
          orderId: 'order-456',
          planName: 'Basic VPS',
          suspendedAt: '2024-01-15T00:00:00Z',
          gracePeriodHours: 24,
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send(suspendPayload);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/internal/notifications/send',
        {
          event: 'VPS_SUSPENDED',
          userId: 'user-123',
          data: suspendPayload.data,
        },
        expect.any(Object)
      );
    });

    it('should send VPS_DESTROYED notification correctly', async () => {
      const destroyPayload = {
        userId: 'user-123',
        event: 'VPS_DESTROYED' as const,
        data: {
          orderId: 'order-456',
          planName: 'Basic VPS',
          reason: 'EXPIRED_NO_RENEWAL',
          terminatedAt: '2024-01-16T00:00:00Z',
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send(destroyPayload);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/internal/notifications/send',
        {
          event: 'VPS_DESTROYED',
          userId: 'user-123',
          data: destroyPayload.data,
        },
        expect.any(Object)
      );
    });

    it('should send RENEWAL_SUCCESS notification correctly', async () => {
      const renewalPayload = {
        userId: 'user-123',
        event: 'RENEWAL_SUCCESS' as const,
        data: {
          orderId: 'order-456',
          planName: 'Basic VPS',
          newExpiry: '2024-02-15T00:00:00Z',
          amount: 50000,
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send(renewalPayload);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/internal/notifications/send',
        {
          event: 'RENEWAL_SUCCESS',
          userId: 'user-123',
          data: renewalPayload.data,
        },
        expect.any(Object)
      );
    });

    it('should send RENEWAL_FAILED_NO_BALANCE notification correctly', async () => {
      const failedPayload = {
        userId: 'user-123',
        event: 'RENEWAL_FAILED_NO_BALANCE' as const,
        data: {
          orderId: 'order-456',
          planName: 'Basic VPS',
          required: 50000,
        },
      };

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send(failedPayload);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/internal/notifications/send',
        {
          event: 'RENEWAL_FAILED_NO_BALANCE',
          userId: 'user-123',
          data: failedPayload.data,
        },
        expect.any(Object)
      );
    });
  });

  describe('headers', () => {
    it('should include X-API-Key header from config', async () => {
      mockConfigService.get.mockReturnValue('custom-api-key');

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send({
        userId: 'user-123',
        event: 'VPS_EXPIRING_SOON',
        data: {},
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'custom-api-key',
          },
        }
      );
    });

    it('should use empty string for X-API-Key when not configured', async () => {
      mockConfigService.get.mockReturnValue('');

      const mockResponse: AxiosResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.send({
        userId: 'user-123',
        event: 'VPS_EXPIRING_SOON',
        data: {},
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': '',
          },
        }
      );
    });
  });
});
