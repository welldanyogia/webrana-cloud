import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
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
} from '../helpers/test-fixtures';
import { UserStatus, VerificationTokenType } from '@prisma/client';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Password Controller Integration Tests', () => {
  let app: INestApplication;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    await startDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 1000, // High limit to not interfere with tests
          },
        ]),
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

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should return 200 for existing email (creates reset token)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        email: 'user@example.com',
        status: UserStatus.active,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'user@example.com' })
        .expect(200);

      expect(response.body.data.message).toContain('reset password');

      // Verify token created in database
      const tokens = await prisma.verificationToken.findMany({
        where: {
          userId: user.id,
          type: VerificationTokenType.password_reset,
        },
      });
      expect(tokens.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 200 for non-existent email (no leak)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.data.message).toContain('reset password');

      // Verify NO token created
      const tokens = await prisma.verificationToken.findMany({
        where: { type: VerificationTokenType.password_reset },
      });
      expect(tokens.length).toBe(0);
    });

    it('should return same response for existing and non-existing email', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      await createTestUser(prisma, { email: 'existing@example.com' });

      const existingResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'existing@example.com' })
        .expect(200);

      await cleanDatabase();

      const nonExistingResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Same message format (no leak)
      expect(existingResponse.body.data.message).toBe(nonExistingResponse.body.data.message);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('should reset password successfully (200)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });
      const oldPasswordHash = (await prisma.user.findUnique({ where: { id: user.id } }))?.passwordHash;

      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: token.token,
          new_password: 'NewSecurePassword123!',
        })
        .expect(200);

      expect(response.body.data.message).toBe('Password berhasil direset');

      // Verify password changed
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.passwordHash).not.toBe(oldPasswordHash);
      expect(updatedUser?.lastPasswordChangeAt).not.toBeNull();
    });

    it('should revoke all refresh tokens after reset', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      // Login to create refresh tokens
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      // Verify tokens exist
      let tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id, revokedAt: null },
      });
      expect(tokens.length).toBe(2);

      // Reset password
      const resetToken = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken.token,
          new_password: 'NewSecurePassword123!',
        })
        .expect(200);

      // Verify all tokens revoked
      tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id, revokedAt: null },
      });
      expect(tokens.length).toBe(0);
    });

    it('should return 400 INVALID_TOKEN for invalid token', async () => {
      if (!dockerAvailable) return;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token-that-does-not-exist',
          new_password: 'NewSecurePassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 400 TOKEN_EXPIRED for expired token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
        expiresInMs: -1000, // Expired
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: token.token,
          new_password: 'NewSecurePassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 400 TOKEN_USED for already used token', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
        used: true,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: token.token,
          new_password: 'NewSecurePassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('TOKEN_USED');
    });

    it('should return 400 for password policy failure', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma);
      const token = await createVerificationToken(prisma, {
        userId: user.id,
        type: VerificationTokenType.password_reset,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: token.token,
          new_password: 'weak',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should return 401 without authentication', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .send({
          current_password: 'OldPassword123!',
          new_password: 'NewPassword123!',
        })
        .expect(401);
    });

    it('should change password successfully (200)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        password: 'OldPassword123!',
        status: UserStatus.active,
      });

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'OldPassword123!' })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;
      const oldPasswordHash = (await prisma.user.findUnique({ where: { id: user.id } }))?.passwordHash;

      // Change password
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          current_password: 'OldPassword123!',
          new_password: 'NewSecurePassword123!',
        })
        .expect(200);

      expect(response.body.data.message).toBe('Password berhasil diubah');

      // Verify password changed
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.passwordHash).not.toBe(oldPasswordHash);
      expect(updatedUser?.lastPasswordChangeAt).not.toBeNull();
    });

    it('should return 400 INVALID_CURRENT_PASSWORD for wrong current password', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        password: 'CorrectPassword123!',
        status: UserStatus.active,
      });

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'CorrectPassword123!' })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Try to change with wrong current password
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          current_password: 'WrongPassword123!',
          new_password: 'NewSecurePassword123!',
        })
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('should return 400 for password policy failure', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        password: 'OldPassword123!',
        status: UserStatus.active,
      });

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'OldPassword123!' })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Try to change with weak password
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          current_password: 'OldPassword123!',
          new_password: 'weak',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
