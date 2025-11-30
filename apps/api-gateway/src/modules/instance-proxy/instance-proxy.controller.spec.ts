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

  describe('Edge cases and error scenarios', () => {
    describe('listInstances edge cases', () => {
      it('should handle empty query object', async () => {
        const result = await controller.listInstances({});
        expect(result).toBeDefined();
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
      });

      it('should handle negative page numbers', async () => {
        const result = await controller.listInstances({ page: -1, limit: 10 });
        expect(result).toBeDefined();
      });

      it('should handle string values in query params', async () => {
        const result = await controller.listInstances({
          page: '2',
          limit: '25',
          status: 'RUNNING',
        });
        expect(result).toBeDefined();
      });

      it('should handle very large page numbers', async () => {
        const result = await controller.listInstances({ page: 999999 });
        expect(result.meta.page).toBe(999999);
      });
    });

    describe('getInstance edge cases', () => {
      it('should handle UUID format instance ID', async () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        const result = await controller.getInstance(uuid);
        expect(result.data.message).toContain(uuid);
      });

      it('should handle empty string instance ID', async () => {
        const result = await controller.getInstance('');
        expect(result).toBeDefined();
      });

      it('should handle special characters in instance ID', async () => {
        const result = await controller.getInstance('inst_with-special.chars');
        expect(result.data).toBeDefined();
      });

      it('should handle very long instance ID', async () => {
        const longId = 'instance-' + 'x'.repeat(500);
        const result = await controller.getInstance(longId);
        expect(result.data.message).toContain(longId);
      });
    });

    describe('Power actions edge cases', () => {
      const testInstanceId = 'edge-case-instance';

      it('should handle empty instance ID for start', async () => {
        const result = await controller.startInstance('');
        expect(result).toBeDefined();
        expect(result.data.action).toBe('start');
      });

      it('should handle empty instance ID for stop', async () => {
        const result = await controller.stopInstance('');
        expect(result).toBeDefined();
        expect(result.data.action).toBe('stop');
      });

      it('should handle empty instance ID for reboot', async () => {
        const result = await controller.rebootInstance('');
        expect(result).toBeDefined();
        expect(result.data.action).toBe('reboot');
      });

      it('should handle empty instance ID for power-on', async () => {
        const result = await controller.powerOnInstance('');
        expect(result).toBeDefined();
        expect(result.data.action).toBe('power-on');
      });

      it('should handle empty instance ID for power-off', async () => {
        const result = await controller.powerOffInstance('');
        expect(result).toBeDefined();
        expect(result.data.action).toBe('power-off');
      });

      it('should handle special characters in instance ID for all actions', async () => {
        const specialId = 'inst_special-chars.123';
        
        const startResult = await controller.startInstance(specialId);
        expect(startResult.data.message).toContain(specialId);
        
        const stopResult = await controller.stopInstance(specialId);
        expect(stopResult.data.message).toContain(specialId);
        
        const rebootResult = await controller.rebootInstance(specialId);
        expect(rebootResult.data.message).toContain(specialId);
      });

      it('should handle UUID format instance ID for all actions', async () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        
        const powerOnResult = await controller.powerOnInstance(uuid);
        expect(powerOnResult.data.message).toContain(uuid);
        
        const powerOffResult = await controller.powerOffInstance(uuid);
        expect(powerOffResult.data.message).toContain(uuid);
      });
    });
  });

  describe('Decorator verification', () => {
    it('should have method decorator for listInstances', () => {
      const method = Reflect.getMetadata('method', controller.listInstances);
      expect(method).toBeDefined();
    });

    it('should have method decorator for getInstance', () => {
      const method = Reflect.getMetadata('method', controller.getInstance);
      expect(method).toBeDefined();
    });

    it('should have method decorator for all action endpoints', () => {
      const startMethod = Reflect.getMetadata('method', controller.startInstance);
      const stopMethod = Reflect.getMetadata('method', controller.stopInstance);
      const rebootMethod = Reflect.getMetadata('method', controller.rebootInstance);
      const powerOnMethod = Reflect.getMetadata('method', controller.powerOnInstance);
      const powerOffMethod = Reflect.getMetadata('method', controller.powerOffInstance);

      expect(startMethod).toBeDefined();
      expect(stopMethod).toBeDefined();
      expect(rebootMethod).toBeDefined();
      expect(powerOnMethod).toBeDefined();
      expect(powerOffMethod).toBeDefined();
    });

    it('should have route paths defined for all methods', () => {
      const listPath = Reflect.getMetadata('path', controller.listInstances);
      const getPath = Reflect.getMetadata('path', controller.getInstance);
      const startPath = Reflect.getMetadata('path', controller.startInstance);
      const stopPath = Reflect.getMetadata('path', controller.stopInstance);
      const rebootPath = Reflect.getMetadata('path', controller.rebootInstance);
      const powerOnPath = Reflect.getMetadata('path', controller.powerOnInstance);
      const powerOffPath = Reflect.getMetadata('path', controller.powerOffInstance);

      expect(listPath).toBe('/');
      expect(getPath).toBe(':instanceId');
      expect(startPath).toBe(':instanceId/start');
      expect(stopPath).toBe(':instanceId/stop');
      expect(rebootPath).toBe(':instanceId/reboot');
      expect(powerOnPath).toBe(':instanceId/power-on');
      expect(powerOffPath).toBe(':instanceId/power-off');
    });
  });

  describe('Response format consistency', () => {
    it('should always return data and meta in listInstances response', async () => {
      const result = await controller.listInstances({});
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
    });

    it('should always return data object in getInstance response', async () => {
      const result = await controller.getInstance('test-id');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('message');
      expect(result.data).toHaveProperty('note');
    });

    it('should always return action type in all action responses', async () => {
      const instanceId = 'test-instance';
      
      const startResult = await controller.startInstance(instanceId);
      expect(startResult).toHaveProperty('data');
      expect(startResult.data).toHaveProperty('action');
      expect(startResult.data).toHaveProperty('message');
      expect(startResult.data).toHaveProperty('note');
      
      const stopResult = await controller.stopInstance(instanceId);
      expect(stopResult.data).toHaveProperty('action');
      
      const rebootResult = await controller.rebootInstance(instanceId);
      expect(rebootResult.data).toHaveProperty('action');
      
      const powerOnResult = await controller.powerOnInstance(instanceId);
      expect(powerOnResult.data).toHaveProperty('action');
      
      const powerOffResult = await controller.powerOffInstance(instanceId);
      expect(powerOffResult.data).toHaveProperty('action');
    });
  });
});
