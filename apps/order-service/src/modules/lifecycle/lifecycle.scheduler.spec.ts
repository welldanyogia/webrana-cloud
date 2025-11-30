import { Test, TestingModule } from '@nestjs/testing';

import { DistributedLockService } from '../../common/services/distributed-lock.service';

import { LifecycleScheduler } from './lifecycle.scheduler';
import { LifecycleService, ProcessingStats } from './lifecycle.service';

describe('LifecycleScheduler', () => {
  let scheduler: LifecycleScheduler;
  let lifecycleService: jest.Mocked<LifecycleService>;
  let lockService: jest.Mocked<DistributedLockService>;

  const mockStats: ProcessingStats = {
    processed: 5,
    succeeded: 4,
    failed: 1,
    skipped: 0,
    errors: [{ orderId: 'order-1', error: 'Test error' }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleScheduler,
        {
          provide: LifecycleService,
          useValue: {
            processExpiringVps: jest.fn(),
            processAutoRenewals: jest.fn(),
            processExpiredVps: jest.fn(),
            processSuspendedVps: jest.fn(),
          },
        },
        {
          provide: DistributedLockService,
          useValue: {
            withLock: jest.fn(),
            getLockInfo: jest.fn(),
            cleanupExpiredLocks: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<LifecycleScheduler>(LifecycleScheduler);
    lifecycleService = module.get(LifecycleService);
    lockService = module.get(DistributedLockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processExpiring', () => {
    it('should process expiring VPS when lock is acquired', async () => {
      (lockService.withLock as jest.Mock).mockImplementation(
        async (_name, _ttl, fn) => fn()
      );
      (lifecycleService.processExpiringVps as jest.Mock).mockResolvedValue(mockStats);

      await scheduler.processExpiring();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-expiring',
        1800,
        expect.any(Function)
      );
      expect(lifecycleService.processExpiringVps).toHaveBeenCalled();
    });

    it('should skip when lock is held by another instance', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processExpiring();

      expect(lifecycleService.processExpiringVps).not.toHaveBeenCalled();
    });
  });

  describe('processRenewals', () => {
    it('should process auto-renewals when lock is acquired', async () => {
      (lockService.withLock as jest.Mock).mockImplementation(
        async (_name, _ttl, fn) => fn()
      );
      (lifecycleService.processAutoRenewals as jest.Mock).mockResolvedValue(mockStats);

      await scheduler.processRenewals();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-renewals',
        3600,
        expect.any(Function)
      );
      expect(lifecycleService.processAutoRenewals).toHaveBeenCalled();
    });

    it('should skip when lock is held by another instance', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processRenewals();

      expect(lifecycleService.processAutoRenewals).not.toHaveBeenCalled();
    });
  });

  describe('processExpired', () => {
    it('should process expired VPS when lock is acquired', async () => {
      (lockService.withLock as jest.Mock).mockImplementation(
        async (_name, _ttl, fn) => fn()
      );
      (lifecycleService.processExpiredVps as jest.Mock).mockResolvedValue(mockStats);

      await scheduler.processExpired();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-expired',
        900,
        expect.any(Function)
      );
      expect(lifecycleService.processExpiredVps).toHaveBeenCalled();
    });

    it('should skip when lock is held by another instance', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processExpired();

      expect(lifecycleService.processExpiredVps).not.toHaveBeenCalled();
    });
  });

  describe('processSuspended', () => {
    it('should process suspended VPS when lock is acquired', async () => {
      (lockService.withLock as jest.Mock).mockImplementation(
        async (_name, _ttl, fn) => fn()
      );
      (lifecycleService.processSuspendedVps as jest.Mock).mockResolvedValue(mockStats);

      await scheduler.processSuspended();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-suspended',
        900,
        expect.any(Function)
      );
      expect(lifecycleService.processSuspendedVps).toHaveBeenCalled();
    });

    it('should skip when lock is held by another instance', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processSuspended();

      expect(lifecycleService.processSuspendedVps).not.toHaveBeenCalled();
    });
  });

  describe('cleanupLocks', () => {
    it('should cleanup expired locks when lock is acquired', async () => {
      (lockService.withLock as jest.Mock).mockImplementation(
        async (_name, _ttl, fn) => fn()
      );
      (lockService.cleanupExpiredLocks as jest.Mock).mockResolvedValue(5);

      await scheduler.cleanupLocks();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-cleanup',
        300,
        expect.any(Function)
      );
      expect(lockService.cleanupExpiredLocks).toHaveBeenCalled();
    });

    it('should skip when lock is held by another instance', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.cleanupLocks();

      expect(lockService.cleanupExpiredLocks).not.toHaveBeenCalled();
    });
  });

  describe('getJobsStatus', () => {
    it('should return status of all lifecycle jobs', async () => {
      const futureLock = {
        lockedBy: 'instance-1',
        lockedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      };
      const expiredLock = {
        lockedBy: 'instance-2',
        lockedAt: new Date(Date.now() - 120000),
        expiresAt: new Date(Date.now() - 60000),
      };

      (lockService.getLockInfo as jest.Mock)
        .mockResolvedValueOnce(futureLock) // expiring - locked
        .mockResolvedValueOnce(null) // renewals - not locked
        .mockResolvedValueOnce(expiredLock) // expired - expired lock
        .mockResolvedValueOnce(futureLock); // suspended - locked

      const status = await scheduler.getJobsStatus();

      expect(status.expiring.locked).toBe(true);
      expect(status.renewals.locked).toBe(false);
      expect(status.expired.locked).toBe(false); // Lock is expired
      expect(status.suspended.locked).toBe(true);
    });

    it('should handle all null locks', async () => {
      (lockService.getLockInfo as jest.Mock).mockResolvedValue(null);

      const status = await scheduler.getJobsStatus();

      expect(status.expiring.locked).toBe(false);
      expect(status.renewals.locked).toBe(false);
      expect(status.expired.locked).toBe(false);
      expect(status.suspended.locked).toBe(false);
    });
  });

  describe('cron timing', () => {
    it('should use correct TTL for expiring job (30 minutes)', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processExpiring();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-expiring',
        1800, // 30 minutes in seconds
        expect.any(Function)
      );
    });

    it('should use correct TTL for renewals job (1 hour)', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processRenewals();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-renewals',
        3600, // 1 hour in seconds
        expect.any(Function)
      );
    });

    it('should use correct TTL for expired job (15 minutes)', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processExpired();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-expired',
        900, // 15 minutes in seconds
        expect.any(Function)
      );
    });

    it('should use correct TTL for suspended job (15 minutes)', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.processSuspended();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-suspended',
        900, // 15 minutes in seconds
        expect.any(Function)
      );
    });

    it('should use correct TTL for cleanup job (5 minutes)', async () => {
      (lockService.withLock as jest.Mock).mockResolvedValue(null);

      await scheduler.cleanupLocks();

      expect(lockService.withLock).toHaveBeenCalledWith(
        'lifecycle-cleanup',
        300, // 5 minutes in seconds
        expect.any(Function)
      );
    });
  });
});
