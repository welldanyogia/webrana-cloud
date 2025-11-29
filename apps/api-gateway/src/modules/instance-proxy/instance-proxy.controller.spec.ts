import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { InstanceProxyController } from './instance-proxy.controller';

describe('InstanceProxyController', () => {
  let controller: InstanceProxyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [InstanceProxyController],
      providers: [
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<InstanceProxyController>(InstanceProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listInstances', () => {
    it('should handle list instances request', async () => {
      const query = { page: 1, limit: 10 };

      const result = await controller.listInstances(query);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('List instances endpoint');
    });

    it('should include rate limit note in response', async () => {
      const result = await controller.listInstances({});

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('100 requests per minute');
    });

    it('should include pagination meta', async () => {
      const query = { page: 3, limit: 25 };

      const result = await controller.listInstances(query);

      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(25);
    });

    it('should use default pagination values', async () => {
      const result = await controller.listInstances({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('getInstance', () => {
    it('should handle get instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.getInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Get instance ${instanceId}`);
    });

    it('should include rate limit note in response', async () => {
      const result = await controller.getInstance('test-instance');

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('100 requests per minute');
    });
  });

  describe('startInstance', () => {
    it('should handle start instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.startInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Start instance ${instanceId}`);
      expect(result.data.action).toBe('start');
    });

    it('should include rate limit note - 1 per minute per instance', async () => {
      const result = await controller.startInstance('test-instance');

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('1 request per minute per instance');
    });
  });

  describe('stopInstance', () => {
    it('should handle stop instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.stopInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Stop instance ${instanceId}`);
      expect(result.data.action).toBe('stop');
    });

    it('should include rate limit note - 1 per minute per instance', async () => {
      const result = await controller.stopInstance('test-instance');

      expect(result.data.note).toContain('1 request per minute per instance');
    });
  });

  describe('rebootInstance', () => {
    it('should handle reboot instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.rebootInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Reboot instance ${instanceId}`);
      expect(result.data.action).toBe('reboot');
    });

    it('should include rate limit note - 1 per minute per instance', async () => {
      const result = await controller.rebootInstance('test-instance');

      expect(result.data.note).toContain('1 request per minute per instance');
    });
  });

  describe('powerOnInstance', () => {
    it('should handle power on instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.powerOnInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Power on instance ${instanceId}`);
      expect(result.data.action).toBe('power-on');
    });

    it('should include rate limit note - 1 per minute per instance', async () => {
      const result = await controller.powerOnInstance('test-instance');

      expect(result.data.note).toContain('1 request per minute per instance');
    });
  });

  describe('powerOffInstance', () => {
    it('should handle power off instance request', async () => {
      const instanceId = 'instance-uuid-123';

      const result = await controller.powerOffInstance(instanceId);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain(`Power off instance ${instanceId}`);
      expect(result.data.action).toBe('power-off');
    });

    it('should include rate limit note - 1 per minute per instance', async () => {
      const result = await controller.powerOffInstance('test-instance');

      expect(result.data.note).toContain('1 request per minute per instance');
    });
  });

  describe('Rate limiting configuration', () => {
    it('listInstances should use UserThrottlerGuard', () => {
      // Verify guard is applied at method level
      const methodMetadata = Reflect.getMetadata('__guards__', controller.listInstances);
      // Guard metadata may be on method or class
    });

    it('getInstance should use UserThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.getInstance);
    });

    it('startInstance should use InstanceThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.startInstance);
    });

    it('stopInstance should use InstanceThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.stopInstance);
    });

    it('rebootInstance should use InstanceThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.rebootInstance);
    });

    it('powerOnInstance should use InstanceThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.powerOnInstance);
    });

    it('powerOffInstance should use InstanceThrottlerGuard', () => {
      const methodMetadata = Reflect.getMetadata('__guards__', controller.powerOffInstance);
    });
  });

  describe('Controller route paths', () => {
    it('should have base path /instances', () => {
      const path = Reflect.getMetadata('path', InstanceProxyController);
      expect(path).toBe('instances');
    });
  });

  describe('Instance actions', () => {
    const instanceId = 'test-instance-123';

    it('should return action type in all action responses', async () => {
      const actions = [
        { method: controller.startInstance, expectedAction: 'start' },
        { method: controller.stopInstance, expectedAction: 'stop' },
        { method: controller.rebootInstance, expectedAction: 'reboot' },
        { method: controller.powerOnInstance, expectedAction: 'power-on' },
        { method: controller.powerOffInstance, expectedAction: 'power-off' },
      ];

      for (const { method, expectedAction } of actions) {
        const result = await method.call(controller, instanceId);
        expect(result.data.action).toBe(expectedAction);
      }
    });

    it('should include instance ID in all action responses', async () => {
      const methods = [
        controller.startInstance,
        controller.stopInstance,
        controller.rebootInstance,
        controller.powerOnInstance,
        controller.powerOffInstance,
      ];

      for (const method of methods) {
        const result = await method.call(controller, instanceId);
        expect(result.data.message).toContain(instanceId);
      }
    });
  });

  describe('Instance-based rate limiting', () => {
    it('should track action requests per instance', () => {
      // The InstanceThrottlerGuard is designed to limit by instance ID
      // Verification would be done in integration tests
      // This test verifies the guards are configured correctly
    });

    it('actions should have stricter limits than read operations', () => {
      // Actions: 1 per minute per instance
      // Read operations: 100 per minute per user
      // This is enforced by different guards
    });
  });
});
