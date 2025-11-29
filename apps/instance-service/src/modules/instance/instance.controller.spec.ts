import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import {
  InstanceNotFoundException,
  InstanceAccessDeniedException,
  ActionNotAllowedException,
  RateLimitExceededException,
  ActionNotFoundException,
} from '../../common/exceptions';

import { InstanceController } from './instance.controller';
import { InstanceService } from './instance.service';
import { InstanceActionType, PaginationQueryDto } from './dto';

describe('InstanceController', () => {
  let controller: InstanceController;
  let instanceService: jest.Mocked<InstanceService>;

  const mockInstanceResponse = {
    id: 'order-uuid-123',
    orderId: 'order-uuid-123',
    hostname: 'vps-test-1234',
    ipAddress: '143.198.123.45',
    status: 'active' as const,
    plan: {
      name: 'Basic 1GB',
      cpu: 1,
      ram: 1024,
      ssd: 25,
    },
    image: {
      name: 'Ubuntu 22.04',
      distribution: 'ubuntu',
    },
    region: 'sgp1',
    createdAt: '2024-01-15T10:30:00Z',
  };

  const mockInstanceDetail = {
    ...mockInstanceResponse,
    ipAddressPrivate: '10.130.0.2',
    vcpus: 1,
    memory: 1024,
    disk: 25,
    doDropletId: '12345678',
  };

  const mockActionResponse = {
    id: 987654321,
    type: 'reboot',
    status: 'in-progress' as const,
    startedAt: '2024-01-15T10:30:00Z',
    completedAt: null,
  };

  const mockUserId = 'user-uuid-456';

  const mockInstanceService = {
    getInstancesByUserId: jest.fn(),
    getInstanceById: jest.fn(),
    triggerAction: jest.fn(),
    getActionStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstanceController],
      providers: [
        {
          provide: InstanceService,
          useValue: mockInstanceService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_ALGORITHM') return 'HS256';
              if (key === 'JWT_SECRET') return 'test-secret';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<InstanceController>(InstanceController);
    instanceService = module.get(InstanceService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getInstances', () => {
    it('should return paginated list of instances', async () => {
      const expectedResult = {
        data: [mockInstanceResponse],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockInstanceService.getInstancesByUserId.mockResolvedValue(expectedResult);

      const query: PaginationQueryDto = { page: 1, limit: 10 };
      const result = await controller.getInstances(mockUserId, query);

      expect(result).toEqual(expectedResult);
      expect(mockInstanceService.getInstancesByUserId).toHaveBeenCalledWith(mockUserId, query);
    });

    it('should return empty list when user has no instances', async () => {
      const expectedResult = {
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockInstanceService.getInstancesByUserId.mockResolvedValue(expectedResult);

      const result = await controller.getInstances(mockUserId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle pagination parameters', async () => {
      const expectedResult = {
        data: [mockInstanceResponse],
        meta: {
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
        },
      };

      mockInstanceService.getInstancesByUserId.mockResolvedValue(expectedResult);

      const result = await controller.getInstances(mockUserId, { page: 2, limit: 5 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
    });
  });

  describe('getInstance', () => {
    it('should return instance detail', async () => {
      mockInstanceService.getInstanceById.mockResolvedValue(mockInstanceDetail);

      const result = await controller.getInstance(mockUserId, 'order-uuid-123');

      expect(result).toEqual({ data: mockInstanceDetail });
      expect(mockInstanceService.getInstanceById).toHaveBeenCalledWith(
        'order-uuid-123',
        mockUserId
      );
    });

    it('should include real-time status from DigitalOcean', async () => {
      mockInstanceService.getInstanceById.mockResolvedValue(mockInstanceDetail);

      const result = await controller.getInstance(mockUserId, 'order-uuid-123');

      expect(result.data.status).toBeDefined();
      expect(result.data.doDropletId).toBeDefined();
    });

    it('should throw InstanceNotFoundException when not found', async () => {
      mockInstanceService.getInstanceById.mockRejectedValue(
        new InstanceNotFoundException('non-existent')
      );

      await expect(
        controller.getInstance(mockUserId, 'non-existent')
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException when user is not owner', async () => {
      mockInstanceService.getInstanceById.mockRejectedValue(
        new InstanceAccessDeniedException('order-uuid-123')
      );

      await expect(
        controller.getInstance('different-user', 'order-uuid-123')
      ).rejects.toThrow(InstanceAccessDeniedException);
    });
  });

  describe('triggerAction', () => {
    it('should trigger reboot action successfully', async () => {
      mockInstanceService.triggerAction.mockResolvedValue(mockActionResponse);

      const result = await controller.triggerAction(
        mockUserId,
        'order-uuid-123',
        { type: InstanceActionType.REBOOT }
      );

      expect(result).toEqual({ data: mockActionResponse });
      expect(mockInstanceService.triggerAction).toHaveBeenCalledWith(
        'order-uuid-123',
        mockUserId,
        InstanceActionType.REBOOT
      );
    });

    it('should trigger power_off action successfully', async () => {
      const powerOffResponse = { ...mockActionResponse, type: 'power_off' };
      mockInstanceService.triggerAction.mockResolvedValue(powerOffResponse);

      const result = await controller.triggerAction(
        mockUserId,
        'order-uuid-123',
        { type: InstanceActionType.POWER_OFF }
      );

      expect(result.data.type).toBe('power_off');
    });

    it('should trigger power_on action successfully', async () => {
      const powerOnResponse = { ...mockActionResponse, type: 'power_on' };
      mockInstanceService.triggerAction.mockResolvedValue(powerOnResponse);

      const result = await controller.triggerAction(
        mockUserId,
        'order-uuid-123',
        { type: InstanceActionType.POWER_ON }
      );

      expect(result.data.type).toBe('power_on');
    });

    it('should trigger reset_password action successfully', async () => {
      const resetPasswordResponse = { ...mockActionResponse, type: 'reset_password' };
      mockInstanceService.triggerAction.mockResolvedValue(resetPasswordResponse);

      const result = await controller.triggerAction(
        mockUserId,
        'order-uuid-123',
        { type: InstanceActionType.RESET_PASSWORD }
      );

      expect(result.data.type).toBe('reset_password');
    });

    it('should throw InstanceNotFoundException when instance not found', async () => {
      mockInstanceService.triggerAction.mockRejectedValue(
        new InstanceNotFoundException('non-existent')
      );

      await expect(
        controller.triggerAction(mockUserId, 'non-existent', { type: InstanceActionType.REBOOT })
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException when not owner', async () => {
      mockInstanceService.triggerAction.mockRejectedValue(
        new InstanceAccessDeniedException('order-uuid-123')
      );

      await expect(
        controller.triggerAction('different-user', 'order-uuid-123', {
          type: InstanceActionType.REBOOT,
        })
      ).rejects.toThrow(InstanceAccessDeniedException);
    });

    it('should throw ActionNotAllowedException for invalid action state', async () => {
      mockInstanceService.triggerAction.mockRejectedValue(
        new ActionNotAllowedException('power_on', 'Instance is already active')
      );

      await expect(
        controller.triggerAction(mockUserId, 'order-uuid-123', {
          type: InstanceActionType.POWER_ON,
        })
      ).rejects.toThrow(ActionNotAllowedException);
    });

    it('should throw RateLimitExceededException when rate limit exceeded', async () => {
      mockInstanceService.triggerAction.mockRejectedValue(
        new RateLimitExceededException('order-uuid-123', 60)
      );

      await expect(
        controller.triggerAction(mockUserId, 'order-uuid-123', {
          type: InstanceActionType.REBOOT,
        })
      ).rejects.toThrow(RateLimitExceededException);
    });
  });

  describe('getActionStatus', () => {
    it('should return action status', async () => {
      const completedAction = {
        ...mockActionResponse,
        status: 'completed' as const,
        completedAt: '2024-01-15T10:31:00Z',
      };
      mockInstanceService.getActionStatus.mockResolvedValue(completedAction);

      const result = await controller.getActionStatus(
        mockUserId,
        'order-uuid-123',
        987654321
      );

      expect(result).toEqual({ data: completedAction });
      expect(mockInstanceService.getActionStatus).toHaveBeenCalledWith(
        'order-uuid-123',
        987654321,
        mockUserId
      );
    });

    it('should return in-progress status', async () => {
      mockInstanceService.getActionStatus.mockResolvedValue(mockActionResponse);

      const result = await controller.getActionStatus(
        mockUserId,
        'order-uuid-123',
        987654321
      );

      expect(result.data.status).toBe('in-progress');
    });

    it('should return errored status', async () => {
      const erroredAction = {
        ...mockActionResponse,
        status: 'errored' as const,
      };
      mockInstanceService.getActionStatus.mockResolvedValue(erroredAction);

      const result = await controller.getActionStatus(
        mockUserId,
        'order-uuid-123',
        987654321
      );

      expect(result.data.status).toBe('errored');
    });

    it('should throw InstanceNotFoundException when instance not found', async () => {
      mockInstanceService.getActionStatus.mockRejectedValue(
        new InstanceNotFoundException('non-existent')
      );

      await expect(
        controller.getActionStatus(mockUserId, 'non-existent', 987654321)
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException when not owner', async () => {
      mockInstanceService.getActionStatus.mockRejectedValue(
        new InstanceAccessDeniedException('order-uuid-123')
      );

      await expect(
        controller.getActionStatus('different-user', 'order-uuid-123', 987654321)
      ).rejects.toThrow(InstanceAccessDeniedException);
    });

    it('should throw ActionNotFoundException when action not found', async () => {
      mockInstanceService.getActionStatus.mockRejectedValue(
        new ActionNotFoundException(999999999)
      );

      await expect(
        controller.getActionStatus(mockUserId, 'order-uuid-123', 999999999)
      ).rejects.toThrow(ActionNotFoundException);
    });
  });

  describe('Authentication guard', () => {
    it('should be protected by JwtAuthGuard decorator', () => {
      const metadata = Reflect.getMetadata('__guards__', InstanceController);
      expect(metadata).toBeDefined();
      expect(metadata.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HTTP status codes', () => {
    it('triggerAction should return 202 Accepted', () => {
      const metadata = Reflect.getMetadata('__httpCode__', controller.triggerAction);
      expect(metadata).toBe(202);
    });
  });
});
