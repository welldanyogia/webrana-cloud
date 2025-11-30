import { Test, TestingModule } from '@nestjs/testing';
import { DoAccountScheduler } from './do-account.scheduler';
import { DoAccountService } from './do-account.service';
import { Logger } from '@nestjs/common';

// Define AccountHealth locally to avoid Prisma client dependency issues in tests
const AccountHealth = {
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
  UNKNOWN: 'UNKNOWN',
} as const;

describe('DoAccountScheduler', () => {
  let scheduler: DoAccountScheduler;
  let doAccountService: jest.Mocked<DoAccountService>;
  let loggerSpy: {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    debug: jest.SpyInstance;
  };

  const mockAccounts = [
    {
      id: 'do-account-1',
      name: 'Primary Account',
      email: 'primary@example.com',
      dropletLimit: 25,
      activeDroplets: 10,
      availableCapacity: 15,
      isActive: true,
      isPrimary: true,
      healthStatus: AccountHealth.HEALTHY,
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'do-account-2',
      name: 'Secondary Account',
      email: 'secondary@example.com',
      dropletLimit: 25,
      activeDroplets: 20,
      availableCapacity: 5,
      isActive: true,
      isPrimary: false,
      healthStatus: AccountHealth.HEALTHY,
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'do-account-3',
      name: 'Inactive Account',
      email: 'inactive@example.com',
      dropletLimit: 25,
      activeDroplets: 0,
      availableCapacity: 25,
      isActive: false,
      isPrimary: false,
      healthStatus: AccountHealth.UNKNOWN,
      lastHealthCheck: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoAccountScheduler,
        {
          provide: DoAccountService,
          useValue: {
            syncAllAccounts: jest.fn(),
            findAll: jest.fn(),
            healthCheck: jest.fn(),
            getOverallStats: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<DoAccountScheduler>(DoAccountScheduler);
    doAccountService = module.get(DoAccountService);

    // Spy on logger methods
    loggerSpy = {
      log: jest.spyOn(Logger.prototype, 'log').mockImplementation(),
      error: jest.spyOn(Logger.prototype, 'error').mockImplementation(),
      warn: jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
      debug: jest.spyOn(Logger.prototype, 'debug').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncAllAccountLimits', () => {
    it('should call doAccountService.syncAllAccounts', async () => {
      doAccountService.syncAllAccounts.mockResolvedValue({
        synced: 2,
        failed: 0,
        errors: [],
      });

      await scheduler.syncAllAccountLimits();

      expect(doAccountService.syncAllAccounts).toHaveBeenCalledTimes(1);
      expect(loggerSpy.log).toHaveBeenCalledWith(
        'Starting scheduled sync for all DO accounts'
      );
      expect(loggerSpy.log).toHaveBeenCalledWith(
        'Completed scheduled sync for all DO accounts'
      );
    });

    it('should log error on failure', async () => {
      const error = new Error('Sync failed');
      doAccountService.syncAllAccounts.mockRejectedValue(error);

      await scheduler.syncAllAccountLimits();

      expect(doAccountService.syncAllAccounts).toHaveBeenCalledTimes(1);
      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to sync DO accounts',
        error.stack
      );
    });

    it('should handle non-Error objects in catch', async () => {
      const errorString = 'String error';
      doAccountService.syncAllAccounts.mockRejectedValue(errorString);

      await scheduler.syncAllAccountLimits();

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to sync DO accounts',
        errorString
      );
    });
  });

  describe('healthCheckAllAccounts', () => {
    it('should check health for all active accounts', async () => {
      doAccountService.findAll.mockResolvedValue(mockAccounts);
      doAccountService.healthCheck.mockResolvedValue(AccountHealth.HEALTHY);

      await scheduler.healthCheckAllAccounts();

      expect(doAccountService.findAll).toHaveBeenCalledTimes(1);
      // Should only check health for active accounts (2 out of 3)
      expect(doAccountService.healthCheck).toHaveBeenCalledTimes(2);
      expect(doAccountService.healthCheck).toHaveBeenCalledWith('do-account-1');
      expect(doAccountService.healthCheck).toHaveBeenCalledWith('do-account-2');
    });

    it('should skip inactive accounts', async () => {
      doAccountService.findAll.mockResolvedValue(mockAccounts);
      doAccountService.healthCheck.mockResolvedValue(AccountHealth.HEALTHY);

      await scheduler.healthCheckAllAccounts();

      // Should not check health for inactive account (do-account-3)
      expect(doAccountService.healthCheck).not.toHaveBeenCalledWith(
        'do-account-3'
      );
    });

    it('should continue checking other accounts if one fails', async () => {
      doAccountService.findAll.mockResolvedValue(mockAccounts);
      doAccountService.healthCheck
        .mockRejectedValueOnce(new Error('Health check failed'))
        .mockResolvedValueOnce(AccountHealth.HEALTHY);

      await scheduler.healthCheckAllAccounts();

      expect(doAccountService.healthCheck).toHaveBeenCalledTimes(2);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'Health check failed for account do-account-1: Health check failed'
      );
    });

    it('should log error if findAll fails', async () => {
      const error = new Error('Database error');
      doAccountService.findAll.mockRejectedValue(error);

      await scheduler.healthCheckAllAccounts();

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to run health checks',
        error.stack
      );
    });
  });

  describe('checkCapacityAlerts', () => {
    it('should log warning when capacity > 80%', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 2,
        activeAccounts: 2,
        healthyAccounts: 2,
        unhealthyAccounts: 0,
        fullAccounts: 0,
        totalDropletLimit: 100,
        totalActiveDroplets: 85, // 85% utilization
        utilizationPercent: 85,
      });

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        'WARNING: DO account capacity at 85.0%'
      );
      expect(loggerSpy.log).toHaveBeenCalledWith(
        '[WARNING] DO capacity alert: 85.0%'
      );
    });

    it('should log critical when capacity > 90%', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 2,
        activeAccounts: 2,
        healthyAccounts: 2,
        unhealthyAccounts: 0,
        fullAccounts: 0,
        totalDropletLimit: 100,
        totalActiveDroplets: 95, // 95% utilization
        utilizationPercent: 95,
      });

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'CRITICAL: DO account capacity at 95.0%'
      );
      expect(loggerSpy.log).toHaveBeenCalledWith(
        '[CRITICAL] DO capacity alert: 95.0%'
      );
    });

    it('should not alert when capacity < 80%', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 2,
        activeAccounts: 2,
        healthyAccounts: 2,
        unhealthyAccounts: 0,
        fullAccounts: 0,
        totalDropletLimit: 100,
        totalActiveDroplets: 50, // 50% utilization
        utilizationPercent: 50,
      });

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('WARNING: DO account capacity')
      );
      expect(loggerSpy.error).not.toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: DO account capacity')
      );
    });

    it('should warn about full accounts', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 2,
        activeAccounts: 2,
        healthyAccounts: 2,
        unhealthyAccounts: 0,
        fullAccounts: 1,
        totalDropletLimit: 100,
        totalActiveDroplets: 50,
        utilizationPercent: 50,
      });

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        '1 DO account(s) are at full capacity'
      );
    });

    it('should handle zero total droplet limit', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 0,
        activeAccounts: 0,
        healthyAccounts: 0,
        unhealthyAccounts: 0,
        fullAccounts: 0,
        totalDropletLimit: 0,
        totalActiveDroplets: 0,
        utilizationPercent: 0,
      });

      await scheduler.checkCapacityAlerts();

      // Should not throw or alert
      expect(loggerSpy.error).not.toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: DO account capacity')
      );
    });

    it('should log error if getOverallStats fails', async () => {
      const error = new Error('Stats error');
      doAccountService.getOverallStats.mockRejectedValue(error);

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.error).toHaveBeenCalledWith(
        'Failed to check capacity alerts',
        error.stack
      );
    });

    it('should alert for multiple full accounts', async () => {
      doAccountService.getOverallStats.mockResolvedValue({
        totalAccounts: 3,
        activeAccounts: 3,
        healthyAccounts: 3,
        unhealthyAccounts: 0,
        fullAccounts: 2,
        totalDropletLimit: 75,
        totalActiveDroplets: 50,
        utilizationPercent: 66.67,
      });

      await scheduler.checkCapacityAlerts();

      expect(loggerSpy.warn).toHaveBeenCalledWith(
        '2 DO account(s) are at full capacity'
      );
    });
  });
});
