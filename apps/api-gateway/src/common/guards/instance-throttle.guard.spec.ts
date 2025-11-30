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

    it('should default to "action" when no action found', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('instance_throttle');
      expect(key).toContain('action');
    });

    it('should extract start action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/start',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('start');
    });

    it('should extract stop action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/stop',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('stop');
    });

    it('should extract power-on action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/power-on',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('power-on');
    });

    it('should extract power-off action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/power-off',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('power-off');
    });

    it('should extract resize action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/resize',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('resize');
    });

    it('should extract rebuild action from path', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/instances/123/rebuild',
            body: {},
          }),
        }),
      } as ExecutionContext;

      const key = (guard as any).generateKey(mockContext, 'test-suffix', 'default');
      expect(key).toContain('rebuild');
    });
  });

  describe('getClientIp', () => {
    it('should extract IP from x-forwarded-for header as string', async () => {
      const mockRequest = {
        user: { sub: 'user-123' },
        params: { instanceId: 'inst-123' },
        body: {},
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:inst-123:user:user-123');
    });

    it('should handle x-forwarded-for as array for unauthenticated users', async () => {
      const mockRequest = {
        user: undefined,
        params: { instanceId: 'inst-123' },
        body: {},
        ip: '127.0.0.1',
        headers: {
          'x-forwarded-for': ['203.0.113.195', '70.41.3.18'],
        },
        socket: { remoteAddress: '127.0.0.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:inst-123:user:203.0.113.195');
    });

    it('should use socket.remoteAddress when ip is not available', async () => {
      const mockRequest = {
        user: undefined,
        params: { instanceId: 'inst-123' },
        body: {},
        ip: undefined,
        headers: {},
        socket: { remoteAddress: '10.0.0.50' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:inst-123:user:10.0.0.50');
    });

    it('should return "unknown" when no IP sources available', async () => {
      const mockRequest = {
        user: undefined,
        params: { instanceId: 'inst-123' },
        body: {},
        ip: undefined,
        headers: {},
        socket: { remoteAddress: undefined },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:inst-123:user:unknown');
    });
  });

  describe('Edge cases for getTracker', () => {
    it('should handle null params', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: null,
        body: { instanceId: 'body-instance' },
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:body-instance:user:user-456');
    });

    it('should handle undefined params', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: undefined,
        body: { instanceId: 'body-instance' },
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:body-instance:user:user-456');
    });

    it('should handle empty params and body', async () => {
      const mockRequest = {
        user: { sub: 'user-456' },
        params: {},
        body: null,
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:unknown:user:user-456');
    });

    it('should handle null user with valid params', async () => {
      const mockRequest = {
        user: null,
        params: { instanceId: 'inst-xyz' },
        body: {},
        ip: '192.168.1.1',
        headers: {},
        socket: { remoteAddress: '192.168.1.1' },
      };

      const tracker = await (guard as any).getTracker(mockRequest);
      expect(tracker).toBe('instance:inst-xyz:user:192.168.1.1');
    });
  });
});
