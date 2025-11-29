import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProvisioningService } from './provisioning.service';
import { DigitalOceanClientService, DropletResponse } from './digitalocean-client.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, ProvisioningStatus } from '@prisma/client';
import {
  OrderNotFoundException,
  PaymentStatusConflictException,
} from '../../common/exceptions';

describe('ProvisioningService', () => {
  let service: ProvisioningService;
  let prismaService: jest.Mocked<PrismaService>;
  let doClient: jest.Mocked<DigitalOceanClientService>;

  const mockOrder = {
    id: 'order-123',
    userId: 'user-456',
    status: OrderStatus.PAID,
    basePrice: 10000,
    promoDiscount: 0,
    couponDiscount: 0,
    finalPrice: 10000,
    currency: 'IDR',
    paidAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProvisioningTask = {
    id: 'task-789',
    orderId: 'order-123',
    status: ProvisioningStatus.PENDING,
    doRegion: 'sgp1',
    doSize: 's-1vcpu-1gb',
    doImage: 'ubuntu-22-04-x64',
    dropletId: null,
    dropletName: null,
    dropletStatus: null,
    ipv4Public: null,
    ipv4Private: null,
    dropletTags: [],
    dropletCreatedAt: null,
    attempts: 0,
    errorCode: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDropletResponse: DropletResponse = {
    id: 12345678,
    name: 'vps-order-12',
    status: 'new',
    memory: 1024,
    vcpus: 1,
    disk: 25,
    region: { slug: 'sgp1', name: 'Singapore 1' },
    image: { id: 123, slug: 'ubuntu-22-04-x64', name: 'Ubuntu 22.04' },
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

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        PROVISIONING_POLL_INTERVAL_MS: 100, // Fast polling for tests
        PROVISIONING_MAX_ATTEMPTS: 3,
        DIGITALOCEAN_DEFAULT_REGION: 'sgp1',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const mockTransaction = jest.fn((callback) => callback({
      order: { update: jest.fn().mockResolvedValue(mockOrder) },
      provisioningTask: { update: jest.fn().mockResolvedValue(mockProvisioningTask) },
      statusHistory: { create: jest.fn().mockResolvedValue({}) },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisioningService,
        {
          provide: PrismaService,
          useValue: {
            order: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            provisioningTask: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            statusHistory: {
              create: jest.fn(),
            },
            $transaction: mockTransaction,
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: DigitalOceanClientService,
          useValue: {
            createDroplet: jest.fn(),
            getDroplet: jest.fn(),
            extractPublicIpv4: jest.fn(),
            extractPrivateIpv4: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProvisioningService>(ProvisioningService);
    prismaService = module.get(PrismaService);
    doClient = module.get(DigitalOceanClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startProvisioning', () => {
    it('should throw OrderNotFoundException if order does not exist', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.startProvisioning('non-existent')).rejects.toThrow(
        OrderNotFoundException
      );
    });

    it('should throw PaymentStatusConflictException if order is not PAID', async () => {
      prismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING_PAYMENT,
      } as any);

      await expect(service.startProvisioning('order-123')).rejects.toThrow(
        PaymentStatusConflictException
      );
    });

    it('should create provisioning task and update order to PROVISIONING', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);
      prismaService.provisioningTask.create.mockResolvedValue(mockProvisioningTask as any);

      // Don't await - startProvisioning is async with setImmediate
      const promise = service.startProvisioning('order-123');

      await promise;

      expect(prismaService.provisioningTask.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-123',
          status: ProvisioningStatus.PENDING,
          doRegion: 'sgp1',
        }),
      });

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('pollDropletStatus', () => {
    it('should call markProvisioningSuccess when droplet becomes active', async () => {
      const activeDroplet = { ...mockDropletResponse, status: 'active' as const };

      doClient.getDroplet.mockResolvedValue(activeDroplet);
      doClient.extractPublicIpv4.mockReturnValue('143.198.123.45');
      doClient.extractPrivateIpv4.mockReturnValue('10.130.0.2');
      prismaService.provisioningTask.findUnique.mockResolvedValue({
        ...mockProvisioningTask,
        dropletId: '12345678',
      } as any);
      prismaService.provisioningTask.update.mockResolvedValue(mockProvisioningTask as any);

      await service.pollDropletStatus('task-789', '12345678');

      expect(doClient.getDroplet).toHaveBeenCalledWith('12345678');
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should call markProvisioningFailed when droplet enters errored state', async () => {
      const erroredDroplet = { ...mockDropletResponse, status: 'errored' as const };

      doClient.getDroplet.mockResolvedValue(erroredDroplet);
      doClient.extractPublicIpv4.mockReturnValue(null);
      doClient.extractPrivateIpv4.mockReturnValue(null);
      prismaService.provisioningTask.findUnique.mockResolvedValue(mockProvisioningTask as any);
      prismaService.provisioningTask.update.mockResolvedValue(mockProvisioningTask as any);

      await service.pollDropletStatus('task-789', '12345678');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should call markProvisioningFailed on timeout (max attempts)', async () => {
      const newDroplet = { ...mockDropletResponse, status: 'new' as const };

      doClient.getDroplet.mockResolvedValue(newDroplet);
      doClient.extractPublicIpv4.mockReturnValue(null);
      doClient.extractPrivateIpv4.mockReturnValue(null);
      prismaService.provisioningTask.findUnique.mockResolvedValue(mockProvisioningTask as any);
      prismaService.provisioningTask.update.mockResolvedValue(mockProvisioningTask as any);

      await service.pollDropletStatus('task-789', '12345678');

      // Should poll maxAttempts times then fail
      expect(doClient.getDroplet).toHaveBeenCalledTimes(3); // maxAttempts = 3 in test config
      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('markProvisioningSuccess', () => {
    it('should update task to SUCCESS and order to ACTIVE', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue({
        ...mockProvisioningTask,
        dropletId: '12345678',
        ipv4Public: '143.198.123.45',
      } as any);

      await service.markProvisioningSuccess('task-789');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should do nothing if task not found', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue(null);

      await service.markProvisioningSuccess('non-existent');

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('markProvisioningFailed', () => {
    it('should update task to FAILED and order to FAILED', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue(mockProvisioningTask as any);

      await service.markProvisioningFailed(
        'task-789',
        'DROPLET_ERRORED',
        'Droplet entered error state'
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should do nothing if task not found', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue(null);

      await service.markProvisioningFailed(
        'non-existent',
        'ERROR',
        'Test error'
      );

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getProvisioningTaskByOrderId', () => {
    it('should return provisioning task for order', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue(mockProvisioningTask as any);

      const result = await service.getProvisioningTaskByOrderId('order-123');

      expect(result).toEqual(mockProvisioningTask);
      expect(prismaService.provisioningTask.findUnique).toHaveBeenCalledWith({
        where: { orderId: 'order-123' },
      });
    });

    it('should return null if no task exists', async () => {
      prismaService.provisioningTask.findUnique.mockResolvedValue(null);

      const result = await service.getProvisioningTaskByOrderId('order-no-task');

      expect(result).toBeNull();
    });
  });
});
