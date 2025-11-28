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
import { createTestUser, createVerificationToken } from '../helpers/test-fixtures';
import { UserStatus, VerificationTokenType } from '@prisma/client';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Password Flow E2E Tests', () => {
  let app: INestApplication;
  let dockerAvailable = false;
  let prisma: PrismaService;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - E2E tests will be skipped');
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

    prisma = getPrismaClient();
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

  describe('Flow: forgot-password → reset-password → login with new password', () => {
    it('should complete password reset flow successfully', async () => {
      if (!dockerAvailable) return;

      // Setup: Create active user
      const testUser = await createTestUser(prisma, {
        email: 'resetflow@example.com',
        password: 'OldPassword123!',
        status: UserStatus.active,
      });

      // Step 1: Request password reset
      const forgotResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(forgotResponse.body.data).toMatchObject({
        message: 'Jika email terdaftar, link reset password akan dikirim',
      });

      // Step 2: Create reset token using helper (simulates token from email)
      const resetToken = await createVerificationToken(prisma, {
        userId: testUser.id,
        type: VerificationTokenType.password_reset,
      });

      // Step 3: Login before reset to get refresh token
      const loginBeforeReset = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const oldRefreshToken = loginBeforeReset.body.data.refresh_token;

      // Step 4: Reset password
      const newPassword = 'NewPassword456!';
      const resetResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken.token, // Use plain text token from helper
          new_password: newPassword,
        })
        .expect(200);

      expect(resetResponse.body.data).toMatchObject({
        message: 'Password berhasil direset',
      });

      // Step 5: Verify old refresh token is revoked
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(400);

      // Step 6: Login with old password should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Step 7: Login with new password should succeed
      const loginNewPassword = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginNewPassword.body.data.user.email).toBe(testUser.email);
      expect(loginNewPassword.body.data.access_token).toBeDefined();
      expect(loginNewPassword.body.data.refresh_token).toBeDefined();

      // Step 8: Verify reset token is marked as used
      const usedToken = await prisma.verificationToken.findUnique({
        where: { id: resetToken.id },
      });
      expect(usedToken?.usedAt).toBeDefined();

      // Step 9: Try to use same token again should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken.token,
          new_password: 'AnotherPassword789!',
        })
        .expect(400);
    });
  });

  describe('Flow: login → change-password → old token invalid → login with new password', () => {
    it('should complete change password flow and invalidate old sessions', async () => {
      if (!dockerAvailable) return;

      // Setup: Create active user
      const testUser = await createTestUser(prisma, {
        email: 'changeflow@example.com',
        password: 'CurrentPassword123!',
        status: UserStatus.active,
      });

      // Step 1: Login to get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;
      const oldRefreshToken = loginResponse.body.data.refresh_token;

      // Step 2: Create another session (device 2)
      const loginDevice2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const device2RefreshToken = loginDevice2.body.data.refresh_token;

      // Verify 2 active sessions
      const activeSessionsBefore = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      expect(activeSessionsBefore.length).toBe(2);

      // Step 3: Change password
      const newPassword = 'UpdatedPassword456!';
      const changeResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          current_password: testUser.password,
          new_password: newPassword,
        })
        .expect(200);

      expect(changeResponse.body.data).toMatchObject({
        message: 'Password berhasil diubah',
      });

      // Step 4: Verify all refresh tokens are revoked
      const activeSessionsAfter = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      expect(activeSessionsAfter.length).toBe(0);

      // Step 5: Try to refresh with old tokens should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: oldRefreshToken })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: device2RefreshToken })
        .expect(400);

      // Step 6: Login with old password should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(401);

      // Step 7: Login with new password should succeed
      const loginNewPassword = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginNewPassword.body.data.user.email).toBe(testUser.email);
      expect(loginNewPassword.body.data.access_token).toBeDefined();
      expect(loginNewPassword.body.data.refresh_token).toBeDefined();

      // Step 8: Verify lastPasswordChangeAt is updated
      const userAfterChange = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(userAfterChange?.lastPasswordChangeAt).toBeDefined();
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response format across all password endpoints', async () => {
      if (!dockerAvailable) return;

      const testUser = await createTestUser(prisma, {
        email: 'format@example.com',
        password: 'Format123!',
        status: UserStatus.active,
      });

      // Test forgot-password response format
      const forgotResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      expect(forgotResponse.body).toHaveProperty('data');
      expect(forgotResponse.body.data).toHaveProperty('message');
      expect(forgotResponse.body).not.toHaveProperty('error');

      // Test change-password response format (success)
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const changeResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${loginResponse.body.data.access_token}`)
        .send({
          current_password: testUser.password,
          new_password: 'NewPassword456!',
        })
        .expect(200);

      expect(changeResponse.body).toHaveProperty('data');
      expect(changeResponse.body.data).toHaveProperty('message');
      expect(changeResponse.body).not.toHaveProperty('error');

      // Test error response format
      const errorResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword456!',
        })
        .expect(400);

      expect(errorResponse.body).toHaveProperty('error');
      expect(errorResponse.body.error).toHaveProperty('code');
      expect(errorResponse.body.error).toHaveProperty('message');
      expect(errorResponse.body).not.toHaveProperty('data');
    });
  });
});
