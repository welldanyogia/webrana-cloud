import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InstanceService } from './instance.service';
import { DigitalOceanService, DropletResponse, DropletActionResponse } from '../digitalocean/digitalocean.service';
import { OrderClientService, Order } from '../order-client/order-client.service';
import {
  InstanceNotFoundException,
  InstanceAccessDeniedException,
  ActionNotAllowedException,
  RateLimitExceededException,
} from '../../common/exceptions';
import { InstanceActionType } from './dto';

describe('InstanceService', () => {
  let service: InstanceService;
  let digitalOceanService: jest.Mocked<DigitalOceanService>;
  let orderClientService: jest.Mocked<OrderClientService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        ACTION_RATE_LIMIT_MS: 60000,
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockDroplet: DropletResponse = {
    id: 12345678,
    name: 'vps-test-1234',
    status: 'active',
    memory: 1024,
    vcpus: 1,
    disk: 25,
    region: { slug: 'sgp1', name: 'Singapore 1' },
    image: { id: 123, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04', distribution: 'Ubuntu' },
    size: { slug: 's-1vcpu-1gb', memory: 1024, vcpus: 1, disk: 25 },
    size_slug: 's-1vcpu-1gb',
    networks: {
      v4: [
        { ip_address: '143.198.123.45', netmask: '255.255.240.0', gateway: '143.198.112.1', type: 'public' },
        { ip_address: '10.130.0.2', netmask: '255.255.0.0', gateway: '10.130.0.1', type: 'private' },
      ],
      v6: [],
    },
    tags: ['webrana'],
    created_at: '2024-01-15T10:30:00Z',
  };

  const mockOrder: Order = {
    id: 'order-uuid-123',
    userId: 'user-uuid-456',
    status: 'ACTIVE',
    basePrice: 100000,
    promoDiscount: 0,
    couponDiscount: 0,
    finalPrice: 100000,
    currency: 'IDR',
    paidAt: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    items: [
      {
        id: 'item-uuid-789',
        planId: 'plan-uuid',
        imageId: 'image-uuid',
        duration: 'MONTHLY',
        planSnapshot: {
          name: 'Basic 1GB',
          cpu: 1,
          ram: 1024,
          ssd: 25,
          bandwidth: 1000,
        },
        imageSnapshot: {
          name: 'Ubuntu 22.04',
          distribution: 'ubuntu',
        },
      },
    ],
    provisioningTask: {
      id: 'task-uuid',
      status: 'COMPLETED',
      dropletId: '12345678',
      dropletName: 'vps-test-1234',
      dropletStatus: 'active',
      ipv4Public: '143.198.123.45',
      ipv4Private: '10.130.0.2',
      doRegion: 'sgp1',
      doSize: 's-1vcpu-1gb',
      doImage: 'ubuntu-22-04-x64',
      errorCode: null,
      errorMessage: null,
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:02:00Z',
    },
  };

  const mockActionResponse: DropletActionResponse = {
    id: 987654321,
    status: 'in-progress',
    type: 'reboot',
    started_at: '2024-01-15T10:30:00Z',
    completed_at: null,
    resource_id: 12345678,
    resource_type: 'droplet',
    region: { slug: 'sgp1', name: 'Singapore 1' },
  };

  beforeEach(async () => {
    const mockDigitalOceanService = {
      getDroplet: jest.fn(),
      triggerAction: jest.fn(),
      getActionStatus: jest.fn(),
      extractPublicIpv4: jest.fn(),
      extractPrivateIpv4: jest.fn(),
    };

    const mockOrderClientService = {
      getActiveOrdersByUserId: jest.fn(),
      getOrderById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstanceService,
        { provide: DigitalOceanService, useValue: mockDigitalOceanService },
        { provide: OrderClientService, useValue: mockOrderClientService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<InstanceService>(InstanceService);
    digitalOceanService = module.get(DigitalOceanService);
    orderClientService = module.get(OrderClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstancesByUserId', () => {
    it('should return paginated list of instances', async () => {
      orderClientService.getActiveOrdersByUserId.mockResolvedValue([mockOrder]);
      digitalOceanService.getDroplet.mockResolvedValue(mockDroplet);
      digitalOceanService.extractPublicIpv4.mockReturnValue('143.198.123.45');

      const result = await service.getInstancesByUserId('user-uuid-456', { page: 1, limit: 10 });

      expect(orderClientService.getActiveOrdersByUserId).toHaveBeenCalledWith('user-uuid-456');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('order-uuid-123');
      expect(result.data[0].status).toBe('active');
      expect(result.meta.total).toBe(1);
    });

    it('should filter out orders without completed provisioning', async () => {
      const pendingOrder = {
        ...mockOrder,
        provisioningTask: {
          ...mockOrder.provisioningTask!,
          status: 'PENDING',
          dropletId: null,
        },
      };
      orderClientService.getActiveOrdersByUserId.mockResolvedValue([pendingOrder]);

      const result = await service.getInstancesByUserId('user-uuid-456', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle empty results', async () => {
      orderClientService.getActiveOrdersByUserId.mockResolvedValue([]);

      const result = await service.getInstancesByUserId('user-uuid-456', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('getInstanceById', () => {
    it('should return instance detail with real-time status', async () => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);
      digitalOceanService.getDroplet.mockResolvedValue(mockDroplet);
      digitalOceanService.extractPublicIpv4.mockReturnValue('143.198.123.45');
      digitalOceanService.extractPrivateIpv4.mockReturnValue('10.130.0.2');

      const result = await service.getInstanceById('order-uuid-123', 'user-uuid-456');

      expect(orderClientService.getOrderById).toHaveBeenCalledWith('order-uuid-123');
      expect(digitalOceanService.getDroplet).toHaveBeenCalledWith('12345678');
      expect(result.id).toBe('order-uuid-123');
      expect(result.status).toBe('active');
      expect(result.doDropletId).toBe('12345678');
    });

    it('should throw InstanceNotFoundException if order not found', async () => {
      orderClientService.getOrderById.mockResolvedValue(null);

      await expect(
        service.getInstanceById('non-existent', 'user-uuid-456')
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException if user is not owner', async () => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);

      await expect(
        service.getInstanceById('order-uuid-123', 'different-user')
      ).rejects.toThrow(InstanceAccessDeniedException);
    });

    it('should throw InstanceNotFoundException if not ACTIVE status', async () => {
      const pendingOrder = { ...mockOrder, status: 'PENDING_PAYMENT' };
      orderClientService.getOrderById.mockResolvedValue(pendingOrder);

      await expect(
        service.getInstanceById('order-uuid-123', 'user-uuid-456')
      ).rejects.toThrow(InstanceNotFoundException);
    });
  });

  describe('triggerAction', () => {
    beforeEach(() => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);
      digitalOceanService.getDroplet.mockResolvedValue(mockDroplet);
      digitalOceanService.triggerAction.mockResolvedValue(mockActionResponse);
    });

    it('should trigger reboot action successfully', async () => {
      const result = await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.REBOOT
      );

      expect(digitalOceanService.triggerAction).toHaveBeenCalledWith('12345678', 'reboot');
      expect(result.id).toBe(987654321);
      expect(result.type).toBe('reboot');
      expect(result.status).toBe('in-progress');
    });

    it('should trigger power_off action successfully', async () => {
      const powerOffResponse = { ...mockActionResponse, type: 'power_off' };
      digitalOceanService.triggerAction.mockResolvedValue(powerOffResponse);

      const result = await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.POWER_OFF
      );

      expect(digitalOceanService.triggerAction).toHaveBeenCalledWith('12345678', 'power_off');
      expect(result.type).toBe('power_off');
    });

    it('should throw InstanceNotFoundException if instance not found', async () => {
      orderClientService.getOrderById.mockResolvedValue(null);

      await expect(
        service.triggerAction('non-existent', 'user-uuid-456', InstanceActionType.REBOOT)
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException if not owner', async () => {
      await expect(
        service.triggerAction('order-uuid-123', 'different-user', InstanceActionType.REBOOT)
      ).rejects.toThrow(InstanceAccessDeniedException);
    });

    it('should throw ActionNotAllowedException for power_on when instance is active', async () => {
      await expect(
        service.triggerAction('order-uuid-123', 'user-uuid-456', InstanceActionType.POWER_ON)
      ).rejects.toThrow(ActionNotAllowedException);
    });

    it('should throw ActionNotAllowedException for reboot when instance is off', async () => {
      const offDroplet = { ...mockDroplet, status: 'off' as const };
      digitalOceanService.getDroplet.mockResolvedValue(offDroplet);

      await expect(
        service.triggerAction('order-uuid-123', 'user-uuid-456', InstanceActionType.REBOOT)
      ).rejects.toThrow(ActionNotAllowedException);
    });

    it('should allow power_on when instance is off', async () => {
      const offDroplet = { ...mockDroplet, status: 'off' as const };
      digitalOceanService.getDroplet.mockResolvedValue(offDroplet);
      const powerOnResponse = { ...mockActionResponse, type: 'power_on' };
      digitalOceanService.triggerAction.mockResolvedValue(powerOnResponse);

      const result = await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.POWER_ON
      );

      expect(result.type).toBe('power_on');
    });
  });

  describe('getActionStatus', () => {
    it('should return action status successfully', async () => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);
      const completedAction = { ...mockActionResponse, status: 'completed' as const, completed_at: '2024-01-15T10:31:00Z' };
      digitalOceanService.getActionStatus.mockResolvedValue(completedAction);

      const result = await service.getActionStatus('order-uuid-123', 987654321, 'user-uuid-456');

      expect(digitalOceanService.getActionStatus).toHaveBeenCalledWith('12345678', 987654321);
      expect(result.status).toBe('completed');
    });

    it('should throw InstanceNotFoundException if instance not found', async () => {
      orderClientService.getOrderById.mockResolvedValue(null);

      await expect(
        service.getActionStatus('non-existent', 987654321, 'user-uuid-456')
      ).rejects.toThrow(InstanceNotFoundException);
    });

    it('should throw InstanceAccessDeniedException if not owner', async () => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);

      await expect(
        service.getActionStatus('order-uuid-123', 987654321, 'different-user')
      ).rejects.toThrow(InstanceAccessDeniedException);
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      orderClientService.getOrderById.mockResolvedValue(mockOrder);
      digitalOceanService.getDroplet.mockResolvedValue(mockDroplet);
      digitalOceanService.triggerAction.mockResolvedValue(mockActionResponse);
    });

    it('should allow first action', async () => {
      const result = await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.REBOOT
      );

      expect(result.id).toBe(987654321);
    });

    it('should throw RateLimitExceededException for subsequent rapid actions', async () => {
      // First action succeeds
      await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.REBOOT
      );

      // Second immediate action should fail
      await expect(
        service.triggerAction('order-uuid-123', 'user-uuid-456', InstanceActionType.REBOOT)
      ).rejects.toThrow(RateLimitExceededException);
    });

    it('should allow actions on different instances', async () => {
      const anotherOrder = { ...mockOrder, id: 'order-uuid-789' };
      orderClientService.getOrderById
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(anotherOrder);

      // First action on first instance
      await service.triggerAction(
        'order-uuid-123',
        'user-uuid-456',
        InstanceActionType.REBOOT
      );

      // Action on different instance should succeed
      const result = await service.triggerAction(
        'order-uuid-789',
        'user-uuid-456',
        InstanceActionType.REBOOT
      );

      expect(result.id).toBe(987654321);
    });
  });
});
