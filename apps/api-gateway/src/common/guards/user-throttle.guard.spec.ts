import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';

import { UserThrottlerGuard } from './user-throttle.guard';

describe('UserThrottlerGuard', () => {
  let guard: UserThrottlerGuard;
  let reflector: Reflector;
  let storageService: ThrottlerStorageService;

  const mockOptions = {
    throttlers: [
      { name: 'default', ttl: 60000, limit: 100 },
    ],
  };

  beforeEach(() => {
    reflector = new Reflector();
    storageService = {
      increment: jest.fn(),
      get: jest.fn(),
    } as any;

    guard = new UserThrottlerGuard(
      mockOptions,
      storageService,
      reflector,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return user ID for authenticated users', async () => {
      const mockRequest = {
        user: { sub: 'user-123', email: 'test@example.com' },
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('user:user-123');
    });

    it('should fall back to IP for unauthenticated users', async () => {
      const mockRequest = {
        user: undefined,
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:192.168.1.1');
    });

    it('should handle user with no sub property', async () => {
      const mockRequest = {
        user: { email: 'test@example.com' },
        ip: '10.0.0.1',
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should extract IP from x-forwarded-for for unauthenticated users', async () => {
      const mockRequest = {
        user: undefined,
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.195',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:203.0.113.195');
    });

    it('should handle x-forwarded-for as array', async () => {
      const mockRequest = {
        user: undefined,
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': ['203.0.113.195', '70.41.3.18'],
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:203.0.113.195');
    });

    it('should handle x-forwarded-for with multiple IPs as string', async () => {
      const mockRequest = {
        user: undefined,
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:203.0.113.195');
    });

    it('should fallback to socket.remoteAddress if ip is not available', async () => {
      const mockRequest = {
        user: undefined,
        ip: undefined,
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should return "unknown" if no IP is available', async () => {
      const mockRequest = {
        user: undefined,
        ip: undefined,
        headers: {},
        socket: { remoteAddress: undefined },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:unknown');
    });

    it('should handle null user object', async () => {
      const mockRequest = {
        user: null,
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:192.168.1.1');
    });

    it('should handle empty user object', async () => {
      const mockRequest = {
        user: {},
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:192.168.1.1');
    });

    it('should handle user with undefined sub property', async () => {
      const mockRequest = {
        user: { sub: undefined, email: 'test@example.com' },
        ip: '10.0.0.1',
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:10.0.0.1');
    });

    it('should handle user with empty string sub property', async () => {
      const mockRequest = {
        user: { sub: '', email: 'test@example.com' },
        ip: '10.0.0.1',
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('ip:10.0.0.1');
    });
  });
});
