import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';

import { AuthThrottlerGuard } from './auth-throttle.guard';

describe('AuthThrottlerGuard', () => {
  let guard: AuthThrottlerGuard;
  let reflector: Reflector;
  let storageService: ThrottlerStorageService;

  const mockOptions = {
    throttlers: [
      { name: 'default', ttl: 60000, limit: 5 },
    ],
  };

  beforeEach(() => {
    reflector = new Reflector();
    storageService = {
      increment: jest.fn(),
      get: jest.fn(),
    } as any;

    guard = new AuthThrottlerGuard(
      mockOptions,
      storageService,
      reflector,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return client IP from request', async () => {
      const mockRequest = {
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('192.168.1.1');
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('203.0.113.195');
    });

    it('should handle x-forwarded-for as array', async () => {
      const mockRequest = {
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': ['203.0.113.195'],
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('203.0.113.195');
    });

    it('should fallback to socket.remoteAddress if ip is not available', async () => {
      const mockRequest = {
        ip: undefined,
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('10.0.0.1');
    });

    it('should return "unknown" if no IP is available', async () => {
      const mockRequest = {
        ip: undefined,
        headers: {},
        socket: { remoteAddress: undefined },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('unknown');
    });
  });

  describe('generateKey', () => {
    it('should include endpoint path in the key', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/auth/login',
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('auth_throttle');
      expect(key).toContain('test-suffix');
    });
  });
});
