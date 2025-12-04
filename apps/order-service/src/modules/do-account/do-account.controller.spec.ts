import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { DoAccountController } from './do-account.controller';
import { DoAccountService } from './do-account.service';

// Define AccountHealth locally to avoid Prisma client dependency issues in tests
const AccountHealth = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
  UNKNOWN: 'UNKNOWN',
} as const;

describe('DoAccountController', () => {
  let controller: DoAccountController;
  let service: jest.Mocked<DoAccountService>;

  const mockDoAccountResponse = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Account',
    email: 'test@example.com',
    dropletLimit: 25,
    activeDroplets: 10,
    availableCapacity: 15,
    isActive: true,
    isPrimary: false,
    healthStatus: AccountHealth.HEALTHY,
    lastHealthCheck: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoAccountService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    syncAccountLimits: jest.fn(),
    syncAllAccounts: jest.fn(),
    healthCheck: jest.fn(),
    getStats: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'INTERNAL_API_KEY') {
        return 'test-api-key';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoAccountController],
      providers: [
        { provide: DoAccountService, useValue: mockDoAccountService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<DoAccountController>(DoAccountController);
    service = module.get(DoAccountService);
  });

  describe('create', () => {
    it('should create a new DO account', async () => {
      const createDto = {
        name: 'Test Account',
        email: 'test@example.com',
        accessToken: 'raw_token',
      };
      mockDoAccountService.create.mockResolvedValue(mockDoAccountResponse);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual({ data: mockDoAccountResponse });
    });
  });

  describe('findAll', () => {
    it('should return all DO accounts', async () => {
      mockDoAccountService.findAll.mockResolvedValue([mockDoAccountResponse]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual({ data: [mockDoAccountResponse] });
    });
  });

  describe('findOne', () => {
    it('should return a DO account by ID', async () => {
      mockDoAccountService.findById.mockResolvedValue(mockDoAccountResponse);

      const result = await controller.findOne(mockDoAccountResponse.id);

      expect(service.findById).toHaveBeenCalledWith(mockDoAccountResponse.id);
      expect(result).toEqual({ data: mockDoAccountResponse });
    });
  });

  describe('update', () => {
    it('should update a DO account', async () => {
      const updateDto = { name: 'Updated Name' };
      const updatedAccount = { ...mockDoAccountResponse, name: 'Updated Name' };
      mockDoAccountService.update.mockResolvedValue(updatedAccount);

      const result = await controller.update(mockDoAccountResponse.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(
        mockDoAccountResponse.id,
        updateDto
      );
      expect(result).toEqual({ data: updatedAccount });
    });
  });

  describe('remove', () => {
    it('should delete a DO account', async () => {
      mockDoAccountService.delete.mockResolvedValue(undefined);

      await controller.remove(mockDoAccountResponse.id);

      expect(service.delete).toHaveBeenCalledWith(mockDoAccountResponse.id);
    });
  });

  describe('sync', () => {
    it('should sync a single account', async () => {
      mockDoAccountService.syncAccountLimits.mockResolvedValue(
        mockDoAccountResponse
      );

      const result = await controller.sync(mockDoAccountResponse.id);

      expect(service.syncAccountLimits).toHaveBeenCalledWith(
        mockDoAccountResponse.id
      );
      expect(result).toEqual({ data: mockDoAccountResponse });
    });
  });

  describe('syncAll', () => {
    it('should sync all accounts', async () => {
      const syncResult = { synced: 2, failed: 1, errors: [] };
      mockDoAccountService.syncAllAccounts.mockResolvedValue(syncResult);

      const result = await controller.syncAll();

      expect(service.syncAllAccounts).toHaveBeenCalled();
      expect(result).toEqual({ data: syncResult });
    });
  });

  describe('healthCheck', () => {
    it('should perform health check on an account', async () => {
      mockDoAccountService.healthCheck.mockResolvedValue(AccountHealth.HEALTHY);

      const result = await controller.healthCheck(mockDoAccountResponse.id);

      expect(service.healthCheck).toHaveBeenCalledWith(mockDoAccountResponse.id);
      expect(result.data).toHaveProperty('accountId', mockDoAccountResponse.id);
      expect(result.data).toHaveProperty('healthStatus', AccountHealth.HEALTHY);
      expect(result.data).toHaveProperty('checkedAt');
    });
  });

  describe('getStats', () => {
    it('should return account statistics', async () => {
      const stats = {
        totalAccounts: 3,
        activeAccounts: 2,
        healthyAccounts: 2,
        totalDropletLimit: 75,
        totalActiveDroplets: 30,
        totalAvailableCapacity: 45,
      };
      mockDoAccountService.getStats.mockResolvedValue(stats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual({ data: stats });
    });
  });
});
