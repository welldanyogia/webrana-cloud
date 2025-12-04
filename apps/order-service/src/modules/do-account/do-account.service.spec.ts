import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';


import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  NoAvailableAccountException,
  AllAccountsFullException,
} from './do-account.exceptions';
import { DoAccountService } from './do-account.service';

// Define AccountHealth locally to avoid Prisma client dependency issues in tests
const AccountHealth = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
  UNKNOWN: 'UNKNOWN',
} as const;

// Mock the DoApiClient
jest.mock('./do-api.client', () => ({
  DoApiClient: jest.fn().mockImplementation(() => ({
    validateToken: jest.fn().mockResolvedValue(true),
    getAccountInfo: jest.fn().mockResolvedValue({
      dropletLimit: 25,
      email: 'test@example.com',
      status: 'active',
      uuid: 'test-uuid',
    }),
    getDropletCount: jest.fn().mockResolvedValue(10),
    getRateLimitInfo: jest.fn().mockResolvedValue({
      limit: 5000,
      remaining: 4500,
      reset: new Date(),
    }),
  })),
}));

describe('DoAccountService', () => {
  let service: DoAccountService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockDoAccount = {
    id: 'do-account-123',
    name: 'Primary DO Account',
    email: 'do@example.com',
    accessToken: 'plain-token', // Not encrypted for tests (no ENCRYPTION_KEY)
    dropletLimit: 25,
    activeDroplets: 10,
    isActive: true,
    isPrimary: true,
    lastHealthCheck: new Date(),
    healthStatus: AccountHealth.HEALTHY,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoAccount2 = {
    id: 'do-account-456',
    name: 'Secondary DO Account',
    email: 'do2@example.com',
    accessToken: 'plain-token-2',
    dropletLimit: 25,
    activeDroplets: 25, // Full
    isActive: true,
    isPrimary: false,
    lastHealthCheck: new Date(),
    healthStatus: AccountHealth.HEALTHY,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | undefined> = {
        ENCRYPTION_KEY: undefined, // No encryption in tests
      };
      return config[key];
    }),
  };

  const mockEncryptionService = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
    isEncrypted: jest.fn(() => false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoAccountService,
        {
          provide: PrismaService,
          useValue: {
            doAccount: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EncryptionService, useValue: mockEncryptionService },
      ],
    }).compile();

    service = module.get<DoAccountService>(DoAccountService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectAvailableAccount', () => {
    it('should throw NoAvailableAccountException when no accounts exist', async () => {
      prismaService.doAccount.findMany.mockResolvedValue([]);

      await expect(service.selectAvailableAccount()).rejects.toThrow(
        NoAvailableAccountException
      );
    });

    it('should return available account when capacity check succeeds', async () => {
      prismaService.doAccount.findMany.mockResolvedValue([mockDoAccount as any]);
      prismaService.doAccount.update.mockResolvedValue(mockDoAccount as any);

      // Mock the getAccountCapacity to return available capacity
      jest.spyOn(service, 'getAccountCapacity').mockResolvedValue({
        dropletLimit: 25,
        activeCount: 10,
        availableCapacity: 15,
      });

      const result = await service.selectAvailableAccount();

      expect(result.id).toEqual(mockDoAccount.id);
      expect(prismaService.doAccount.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          healthStatus: { in: [AccountHealth.HEALTHY, AccountHealth.UNKNOWN] },
        },
        orderBy: [{ isPrimary: 'desc' }, { activeDroplets: 'asc' }],
      });
    });

    it('should throw AllAccountsFullException when all accounts are full', async () => {
      prismaService.doAccount.findMany.mockResolvedValue([mockDoAccount2 as any]);
      prismaService.doAccount.update.mockResolvedValue(mockDoAccount2 as any);

      // Mock the getAccountCapacity to return no available capacity
      jest.spyOn(service, 'getAccountCapacity').mockResolvedValue({
        dropletLimit: 25,
        activeCount: 25,
        availableCapacity: 0,
      });

      await expect(service.selectAvailableAccount()).rejects.toThrow(
        AllAccountsFullException
      );
    });

    it('should skip unhealthy accounts and select next available', async () => {
      const unhealthyAccount = {
        ...mockDoAccount,
        id: 'do-account-unhealthy',
        healthStatus: AccountHealth.UNHEALTHY,
      };
      const healthyAccount = mockDoAccount;

      prismaService.doAccount.findMany.mockResolvedValue([
        unhealthyAccount as any,
        healthyAccount as any,
      ]);
      prismaService.doAccount.update.mockResolvedValue(healthyAccount as any);

      // First call throws (unhealthy), second succeeds
      jest
        .spyOn(service, 'getAccountCapacity')
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          dropletLimit: 25,
          activeCount: 10,
          availableCapacity: 15,
        });

      const result = await service.selectAvailableAccount();

      // Should return the second (healthy) account
      expect(result.id).toBe(healthyAccount.id);
    });
  });

  describe('getDecryptedToken', () => {
    it('should throw NotFoundException when account not found', async () => {
      prismaService.doAccount.findUnique.mockResolvedValue(null);

      await expect(service.getDecryptedToken('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should return token when encryption key is not set (plain text)', async () => {
      prismaService.doAccount.findUnique.mockResolvedValue(mockDoAccount as any);

      const token = await service.getDecryptedToken(mockDoAccount.id);

      expect(token).toBe(mockDoAccount.accessToken);
    });
  });

  describe('incrementActiveCount', () => {
    it('should increment active droplet count', async () => {
      prismaService.doAccount.update.mockResolvedValue({
        ...mockDoAccount,
        activeDroplets: 11,
      } as any);

      await service.incrementActiveCount(mockDoAccount.id);

      expect(prismaService.doAccount.update).toHaveBeenCalledWith({
        where: { id: mockDoAccount.id },
        data: { activeDroplets: { increment: 1 } },
      });
    });
  });

  describe('decrementActiveCount', () => {
    it('should decrement active droplet count', async () => {
      prismaService.doAccount.update.mockResolvedValue({
        ...mockDoAccount,
        activeDroplets: 9,
      } as any);

      await service.decrementActiveCount(mockDoAccount.id);

      expect(prismaService.doAccount.update).toHaveBeenCalledWith({
        where: { id: mockDoAccount.id },
        data: { activeDroplets: { decrement: 1 } },
      });
    });
  });

  describe('findById', () => {
    it('should return account when found', async () => {
      prismaService.doAccount.findUnique.mockResolvedValue(mockDoAccount as any);

      const result = await service.findById(mockDoAccount.id);

      expect(result).toEqual(mockDoAccount);
    });

    it('should return null when not found', async () => {
      prismaService.doAccount.findUnique.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('encryption', () => {
    it('should return plaintext when no encryption key is set', () => {
      const plaintext = 'test-token';
      const encrypted = service.encrypt(plaintext);
      expect(encrypted).toBe(plaintext);

      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });
});
