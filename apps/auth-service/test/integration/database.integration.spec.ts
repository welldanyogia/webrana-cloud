import { UserRole, UserStatus, VerificationTokenType } from '@prisma/client';

import {
  startDatabase,
  stopDatabase,
  cleanDatabase,
  getPrismaClient,
  isDockerAvailable,
} from '../helpers/test-database';
import {
  createTestUser,
  createVerificationToken,
  createRefreshToken,
  createExpiredVerificationToken,
} from '../helpers/test-fixtures';

/**
 * Database Integration Tests
 *
 * REQUIREMENTS:
 * - Docker must be running for these tests to execute
 * - Tests will be skipped automatically if Docker is not available
 *
 * To run: npm run test:integration or npx nx test auth-service --testFile=database.integration.spec.ts
 */

describe('Database Integration Tests', () => {
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    await startDatabase();
  }, 120000);

  afterAll(async () => {
    if (dockerAvailable) {
      await stopDatabase();
    }
  });

  beforeEach(async () => {
    if (!dockerAvailable) return;
    await cleanDatabase();
  });

  describe('Database Connection', () => {
    it('should connect to PostgreSQL container', async () => {
      if (!dockerAvailable) {
        console.log('  ⏭️  Skipped - Docker not available');
        return;
      }

      const prisma = getPrismaClient();
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toEqual([{ connected: 1 }]);
    });

    it('should have all tables created by migrations', async () => {
      if (!dockerAvailable) {
        console.log('  ⏭️  Skipped - Docker not available');
        return;
      }

      const prisma = getPrismaClient();
      const users = await prisma.user.findMany();
      const refreshTokens = await prisma.refreshToken.findMany();
      const verificationTokens = await prisma.verificationToken.findMany();
      const userMfa = await prisma.userMfa.findMany();

      expect(users).toEqual([]);
      expect(refreshTokens).toEqual([]);
      expect(verificationTokens).toEqual([]);
      expect(userMfa).toEqual([]);
    });
  });

  describe('Test Fixtures - createTestUser()', () => {
    it('should create a user with default values', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);

      expect(user.id).toBeDefined();
      expect(user.email).toContain('@example.com');
      expect(user.fullName).toBe('Test User');
      expect(user.role).toBe(UserRole.customer);
      expect(user.status).toBe(UserStatus.active);
      expect(user.password).toBe('TestPassword123!');
      expect(user.passwordHash).not.toBe(user.password);
    });

    it('should create a user with custom values', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        email: 'admin@webrana.cloud',
        password: 'AdminPass456!',
        fullName: 'Admin User',
        role: UserRole.admin,
        status: UserStatus.pending_verification,
      });

      expect(user.email).toBe('admin@webrana.cloud');
      expect(user.fullName).toBe('Admin User');
      expect(user.role).toBe(UserRole.admin);
      expect(user.status).toBe(UserStatus.pending_verification);
      expect(user.password).toBe('AdminPass456!');
    });

    it('should persist user in database', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);

      const found = await prisma.user.findUnique({
        where: { id: user.id },
      });

      expect(found).not.toBeNull();
      expect(found?.email).toBe(user.email);
    });
  });

  describe('Test Fixtures - createVerificationToken()', () => {
    it('should create verification token for email verification', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.email_verification,
      });

      expect(token.id).toBeDefined();
      expect(token.userId).toBe(user.id);
      expect(token.type).toBe(VerificationTokenType.email_verification);
      expect(token.token).toHaveLength(64);
      expect(token.tokenHash).toHaveLength(64);
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(token.usedAt).toBeNull();
    });

    it('should create verification token for password reset', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
      });

      expect(token.type).toBe(VerificationTokenType.password_reset);
    });

    it('should create expired verification token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createExpiredVerificationToken(prisma, user.id);

      expect(token.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should create used verification token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        used: true,
      });

      expect(token.usedAt).not.toBeNull();
    });
  });

  describe('Test Fixtures - createRefreshToken()', () => {
    it('should create refresh token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createRefreshToken(prisma, {
        userId: user.id,
      });

      expect(token.id).toBeDefined();
      expect(token.userId).toBe(user.id);
      expect(token.token).toContain('mock-refresh-token-');
      expect(token.tokenHash).toHaveLength(64);
      expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(token.revokedAt).toBeNull();
    });

    it('should create refresh token with device info', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createRefreshToken(prisma, {
        userId: user.id,
        deviceInfo: 'Chrome on Windows',
        ipAddress: '192.168.1.1',
      });

      expect(token.deviceInfo).toBe('Chrome on Windows');
      expect(token.ipAddress).toBe('192.168.1.1');
    });

    it('should create revoked refresh token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createRefreshToken(prisma, {
        userId: user.id,
        revoked: true,
      });

      expect(token.revokedAt).not.toBeNull();
    });
  });

  describe('Database Cleanup', () => {
    it('should clean all data between tests', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const user = await createTestUser(prisma);
      await createVerificationToken(prisma, { userId: user.id });
      await createRefreshToken(prisma, { userId: user.id });

      await cleanDatabase();

      const users = await prisma.user.findMany();
      const tokens = await prisma.verificationToken.findMany();
      const refreshTokens = await prisma.refreshToken.findMany();

      expect(users).toHaveLength(0);
      expect(tokens).toHaveLength(0);
      expect(refreshTokens).toHaveLength(0);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should cascade delete verification tokens when user is deleted', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      await createVerificationToken(prisma, { userId: user.id });

      await prisma.user.delete({ where: { id: user.id } });

      const tokens = await prisma.verificationToken.findMany();
      expect(tokens).toHaveLength(0);
    });

    it('should cascade delete refresh tokens when user is deleted', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      await createRefreshToken(prisma, { userId: user.id });

      await prisma.user.delete({ where: { id: user.id } });

      const tokens = await prisma.refreshToken.findMany();
      expect(tokens).toHaveLength(0);
    });
  });
});
