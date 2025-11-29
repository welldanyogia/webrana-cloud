import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse, AxiosError } from 'axios';
import { of, throwError } from 'rxjs';

import {
  UserNotFoundException,
  AuthServiceUnavailableException,
} from '../../common/exceptions/notification.exceptions';

import { AuthClientService, UserInfo } from './auth-client.service';

describe('AuthClientService', () => {
  let service: AuthClientService;
  let _httpService: HttpService;
  let _configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        INTERNAL_API_KEY: 'test-api-key',
        AUTH_SERVICE_URL: 'http://localhost:3001',
        AUTH_SERVICE_TIMEOUT_MS: 5000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthClientService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AuthClientService>(AuthClientService);
    _httpService = module.get<HttpService>(HttpService);
    _configService = module.get<ConfigService>(ConfigService);

    // Clear cache before each test
    service.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserById', () => {
    const mockUser: UserInfo = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      telegramChatId: '123456789',
    };

    const mockResponse: AxiosResponse = {
      data: { data: mockUser },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    it('should fetch user info successfully', async () => {
      mockHttpService.get.mockReturnValue(of(mockResponse));

      const result = await service.getUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        '/api/v1/internal/users/user-123',
        expect.objectContaining({
          headers: { 'X-API-Key': 'test-api-key' },
        })
      );
    });

    it('should return cached user on second call', async () => {
      mockHttpService.get.mockReturnValue(of(mockResponse));

      // First call
      await service.getUserById('user-123');
      // Second call
      const result = await service.getUserById('user-123');

      expect(result).toEqual(mockUser);
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('should throw UserNotFoundException for 404 response', async () => {
      const error = {
        response: {
          status: 404,
          data: { error: { code: 'NOT_FOUND', message: 'User not found' } },
        },
        isAxiosError: true,
      } as AxiosError;

      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getUserById('non-existent')).rejects.toThrow(
        UserNotFoundException
      );
    });

    it('should throw AuthServiceUnavailableException for connection errors', async () => {
      const error = {
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        isAxiosError: true,
      } as AxiosError;

      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getUserById('user-123')).rejects.toThrow(
        AuthServiceUnavailableException
      );
    });
  });

  describe('clearCache', () => {
    it('should clear specific user cache', async () => {
      const mockUser: UserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockResponse: AxiosResponse = {
        data: { data: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      // First call to populate cache
      await service.getUserById('user-123');

      // Clear cache for this user
      service.clearCache('user-123');

      // Should make another HTTP call
      await service.getUserById('user-123');

      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache when no userId provided', async () => {
      const mockUser: UserInfo = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockResponse: AxiosResponse = {
        data: { data: mockUser },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.get.mockReturnValue(of(mockResponse));

      await service.getUserById('user-123');
      service.clearCache();
      await service.getUserById('user-123');

      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });
  });
});
