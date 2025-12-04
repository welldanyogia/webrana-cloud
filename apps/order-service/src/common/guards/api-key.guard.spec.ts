import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const validApiKey = 'test-api-key-12345';

  const createMockExecutionContext = (apiKey?: string): ExecutionContext => {
    const request = {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('with valid INTERNAL_API_KEY configured', () => {
    let guard: ApiKeyGuard;

    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'INTERNAL_API_KEY') return validApiKey;
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ApiKeyGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    });

    it('should allow request with valid API key', () => {
      const context = createMockExecutionContext(validApiKey);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should reject request with invalid API key', () => {
      const context = createMockExecutionContext('wrong-api-key');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error.response).toMatchObject({
          code: 'API_KEY_INVALID',
        });
      }
    });

    it('should reject request with missing API key', () => {
      const context = createMockExecutionContext();
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error.response).toMatchObject({
          code: 'API_KEY_MISSING',
        });
      }
    });

    it('should reject request with empty API key', () => {
      const context = createMockExecutionContext('');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('without INTERNAL_API_KEY configured', () => {
    let guard: ApiKeyGuard;

    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'INTERNAL_API_KEY') return ''; // Not configured
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ApiKeyGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    });

    it('should reject all requests when API key not configured', () => {
      const context = createMockExecutionContext('any-key');
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error.response).toMatchObject({
          code: 'API_KEY_NOT_CONFIGURED',
        });
      }
    });
  });
});
