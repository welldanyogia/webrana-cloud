import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';

import { DistributedLockService } from './distributed-lock.service';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockLock = {
    id: 'lock-uuid',
    jobName: 'test-job',
    lockedAt: new Date(),
    lockedBy: '',
    expiresAt: new Date(Date.now() + 60000), // 1 minute from now
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        {
          provide: PrismaService,
          useValue: {
            $executeRaw: jest.fn(),
            cronJobLock: {
              findUnique: jest.fn(),
              deleteMany: jest.fn(),
              updateMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
    prismaService = module.get(PrismaService);

    // Update mock lock to have this instance's ID
    mockLock.lockedBy = service.getInstanceId();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstanceId', () => {
    it('should return a unique instance identifier', () => {
      const instanceId = service.getInstanceId();

      expect(instanceId).toBeDefined();
      expect(instanceId).toContain('instance_');
      expect(instanceId).toContain(process.pid.toString());
    });

    it('should return consistent instance ID', () => {
      const id1 = service.getInstanceId();
      const id2 = service.getInstanceId();

      expect(id1).toBe(id2);
    });
  });

  describe('acquireLock', () => {
    it('should return true when lock is acquired successfully', async () => {
      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(mockLock);

      const result = await service.acquireLock('test-job', 60);

      expect(result).toBe(true);
      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });

    it('should return false when lock is held by another instance', async () => {
      const otherLock = {
        ...mockLock,
        lockedBy: 'other-instance',
      };

      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(0);
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(otherLock);

      const result = await service.acquireLock('test-job', 60);

      expect(result).toBe(false);
    });

    it('should return false when database operation fails', async () => {
      (prismaService.$executeRaw as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.acquireLock('test-job', 60);

      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release lock owned by this instance', async () => {
      (prismaService.cronJobLock.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      await service.releaseLock('test-job');

      expect(prismaService.cronJobLock.deleteMany).toHaveBeenCalledWith({
        where: {
          jobName: 'test-job',
          lockedBy: service.getInstanceId(),
        },
      });
    });

    it('should not throw when release fails', async () => {
      (prismaService.cronJobLock.deleteMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.releaseLock('test-job')).resolves.not.toThrow();
    });
  });

  describe('withLock', () => {
    it('should execute function when lock is acquired', async () => {
      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(mockLock);
      (prismaService.cronJobLock.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-job', 60, fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
    });

    it('should return null when lock cannot be acquired', async () => {
      const otherLock = { ...mockLock, lockedBy: 'other-instance' };
      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(0);
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(otherLock);

      const fn = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('test-job', 60, fn);

      expect(result).toBeNull();
      expect(fn).not.toHaveBeenCalled();
    });

    it('should release lock even if function throws', async () => {
      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(1);
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(mockLock);
      (prismaService.cronJobLock.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const fn = jest.fn().mockRejectedValue(new Error('Function error'));

      await expect(service.withLock('test-job', 60, fn)).rejects.toThrow('Function error');
      expect(prismaService.cronJobLock.deleteMany).toHaveBeenCalled();
    });
  });

  describe('extendLock', () => {
    it('should extend lock when owned by this instance', async () => {
      (prismaService.cronJobLock.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await service.extendLock('test-job', 60);

      expect(result).toBe(true);
      expect(prismaService.cronJobLock.updateMany).toHaveBeenCalledWith({
        where: {
          jobName: 'test-job',
          lockedBy: service.getInstanceId(),
        },
        data: {
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should return false when lock not owned', async () => {
      (prismaService.cronJobLock.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.extendLock('test-job', 60);

      expect(result).toBe(false);
    });
  });

  describe('isLocked', () => {
    it('should return true when lock exists and is not expired', async () => {
      const futureLock = {
        ...mockLock,
        expiresAt: new Date(Date.now() + 60000),
      };
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(futureLock);

      const result = await service.isLocked('test-job');

      expect(result).toBe(true);
    });

    it('should return false when lock exists but is expired', async () => {
      const expiredLock = {
        ...mockLock,
        expiresAt: new Date(Date.now() - 1000),
      };
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(expiredLock);

      const result = await service.isLocked('test-job');

      expect(result).toBe(false);
    });

    it('should return false when no lock exists', async () => {
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.isLocked('test-job');

      expect(result).toBe(false);
    });
  });

  describe('getLockInfo', () => {
    it('should return lock info when lock exists', async () => {
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(mockLock);

      const result = await service.getLockInfo('test-job');

      expect(result).toEqual({
        lockedBy: mockLock.lockedBy,
        lockedAt: mockLock.lockedAt,
        expiresAt: mockLock.expiresAt,
      });
    });

    it('should return null when no lock exists', async () => {
      (prismaService.cronJobLock.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getLockInfo('test-job');

      expect(result).toBeNull();
    });
  });

  describe('cleanupExpiredLocks', () => {
    it('should delete expired locks', async () => {
      (prismaService.cronJobLock.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredLocks();

      expect(result).toBe(5);
      expect(prismaService.cronJobLock.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
