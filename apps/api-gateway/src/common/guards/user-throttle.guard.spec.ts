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
  });
});
