import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
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
} from '../helpers/test-fixtures';
import { UserStatus, VerificationTokenType } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth Controller Integration Tests', () => {
  let app: INestApplication;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    // Start database first to get DATABASE_URL
    await startDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          // Use test environment variables set by startDatabase()
        }),
        PrismaModule,
        AuthModule,
      ],
      providers: [
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaClient())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1/auth');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      })
    );
    await app.init();
  }, 180000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dockerAvailable) {
      await stopDatabase();
    }
  });

  beforeEach(async () => {
    if (!dockerAvailable) return;
    await cleanDatabase();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register user successfully (201)', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'ValidPassword123!',
          full_name: 'New User',
        })
        .expect(201);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.full_name).toBe('New User');
      expect(response.body.data.status).toBe('pending_verification');
      expect(response.body.data.verification_token).toBeDefined();
      expect(response.body.data.id).toBeDefined();

      // Verify user in database
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).not.toBeNull();
      expect(user?.status).toBe(UserStatus.pending_verification);
    });

    it('should return 409 EMAIL_EXISTS when email already registered', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, { email: 'existing@example.com' });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'ValidPassword123!',
          full_name: 'Test User',
        })
        .expect(409);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 BAD_REQUEST for invalid email', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'ValidPassword123!',
          full_name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 BAD_REQUEST for password policy failure', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          full_name: 'Test User',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    it('should verify email successfully (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        status: UserStatus.pending_verification,
      });
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.email_verification,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: token.token })
        .expect(201);

      expect(response.body.data.message).toBe('Email berhasil diverifikasi');
      expect(response.body.data.user_id).toBe(user.id);

      // Verify user status updated
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.status).toBe(UserStatus.active);
    });

    it('should return 400 INVALID_TOKEN for non-existent token', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: 'nonexistent-token-hash-that-does-not-exist-in-db' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 TOKEN_EXPIRED for expired token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.email_verification,
        expiresInMs: -1000, // Expired
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: token.token })
        .expect(400);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 400 TOKEN_USED for already used token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.email_verification,
        used: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: token.token })
        .expect(400);

      expect(response.body.error.code).toBe('TOKEN_USED');
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should resend verification successfully (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        status: UserStatus.pending_verification,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: user.email })
        .expect(201);

      expect(response.body.data.message).toContain('Jika email terdaftar');
      expect(response.body.data.verification_token).toBeDefined();

      // Verify new token created
      const tokens = await prisma.verificationToken.findMany({
        where: { userId: user.id },
      });
      expect(tokens.length).toBeGreaterThanOrEqual(1);
    });

    it('should return same response for non-existent email (no leak)', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' })
        .expect(201);

      expect(response.body.data.message).toContain('Jika email terdaftar');
      // Should NOT have verification_token for non-existent user
      expect(response.body.data.verification_token).toBeUndefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login active user successfully (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        email: 'active@example.com',
        password: 'ValidPassword123!',
        status: UserStatus.active,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'active@example.com',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.token_type).toBe('Bearer');
      expect(response.body.data.expires_in).toBe(900);
      expect(response.body.data.user.email).toBe('active@example.com');
      expect(response.body.data.requires_verification).toBe(false);

      // Verify last_login_at updated
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.lastLoginAt).not.toBeNull();
    });

    it('should login pending_verification user with flag (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, {
        email: 'pending@example.com',
        password: 'ValidPassword123!',
        status: UserStatus.pending_verification,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'pending@example.com',
          password: 'ValidPassword123!',
        })
        .expect(201);

      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.requires_verification).toBe(true);
    });

    it('should return 403 ACCOUNT_SUSPENDED for suspended user', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, {
        email: 'suspended@example.com',
        password: 'ValidPassword123!',
        status: UserStatus.suspended,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'suspended@example.com',
          password: 'ValidPassword123!',
        })
        .expect(403);

      expect(response.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should return 403 ACCOUNT_DELETED for deleted user', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, {
        email: 'deleted@example.com',
        password: 'ValidPassword123!',
        status: UserStatus.deleted,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'deleted@example.com',
          password: 'ValidPassword123!',
        })
        .expect(403);

      expect(response.body.error.code).toBe('ACCOUNT_DELETED');
    });

    it('should return 401 INVALID_CREDENTIALS for wrong password', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, {
        email: 'user@example.com',
        password: 'ValidPassword123!',
        status: UserStatus.active,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 INVALID_CREDENTIALS for non-existent user', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens successfully with rotation (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      // Login to get valid tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      const oldRefreshToken = loginResponse.body.data.refresh_token;

      // Wait a bit to ensure different token
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(201);

      expect(refreshResponse.body.data.access_token).toBeDefined();
      expect(refreshResponse.body.data.refresh_token).toBeDefined();
      expect(refreshResponse.body.data.refresh_token).not.toBe(oldRefreshToken);

      // Verify old token is revoked
      const oldTokenHash = createHash('sha256').update(oldRefreshToken).digest('hex');
      const oldToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: oldTokenHash },
      });
      expect(oldToken?.revokedAt).not.toBeNull();
    });

    it('should return 400 INVALID_TOKEN for invalid refresh token', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 INVALID_TOKEN for already revoked token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      // Login to get valid tokens
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      const refreshToken = loginResponse.body.data.refresh_token;

      // Use refresh token once
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(201);

      // Try to use same token again (should fail - token reuse)
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(201);

      const refreshToken = loginResponse.body.data.refresh_token;

      // Logout
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refresh_token: refreshToken })
        .expect(201);

      expect(response.body.data.message).toBe('Logout berhasil');

      // Verify token revoked
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      const token = await prisma.refreshToken.findUnique({
        where: { tokenHash },
      });
      expect(token?.revokedAt).not.toBeNull();
    });

    it('should return 201 for invalid token (idempotent)', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refresh_token: 'invalid-token' })
        .expect(201);

      expect(response.body.data.message).toBe('Logout berhasil');
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    it('should return 401 without authentication', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .expect(401);
    });

    it('should logout all sessions with valid token (201)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      // Login multiple times to create multiple sessions
      const login1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      const login2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(201);

      const accessToken = login1.body.data.access_token;

      // Logout all
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.data.message).toBe('Semua sesi berhasil di-logout');

      // Verify all tokens revoked
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);
    });
  });
});
