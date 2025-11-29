import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { InstanceThrottlerGuard } from './instance-throttle.guard';

describe('InstanceThrottlerGuard', () => {
  let guard: InstanceThrottlerGuard;
  let reflector: Reflector;
  let storageService: ThrottlerStorageService;

  const mockOptions = {
    throttlers: [
      { name: 'default', ttl: 60000, limit: 1 },
    ],
  };

  beforeEach(() => {
    reflector = new Reflector();
    storageService = {
      increment: jest.fn(),
      get: jest.fn(),
    } as any;

    guard = new InstanceThrottlerGuard(
      mockOptions,
      storageService,
      reflector,
    );
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return combined instance ID and user ID', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: { instanceId: 'instance-789' },
        body: {},
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:instance-789:user:user-456');
    });

    it('should use id param as fallback for instance ID', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: { id: 'instance-123' },
        body: {},
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:instance-123:user:user-456');
    });

    it('should use body.instanceId as fallback', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: {},
        body: { instanceId: 'instance-999' },
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:instance-999:user:user-456');
    });

    it('should fallback to IP when user is not authenticated', async () => {
      const mockRequest = {
        user: undefined,
        params: { instanceId: 'instance-789' },
        body: {},
        ip: '10.0.0.1',
        headers: {},
        socket: { remoteAddress: '10.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:instance-789:user:10.0.0.1');
    });

    it('should use "unknown" for missing instance ID', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: {},
        body: {},
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:unknown:user:user-456');
    });
  });

  describe('generateKey', () => {
    it('should extract action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/reboot',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('instance_throttle');
      expect(key).toContain('reboot');
    });

    it('should extract action from body as fallback', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/action',
            body: { action: 'snapshot' },
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('instance_throttle');
      expect(key).toContain('snapshot');
    });
  });
});
