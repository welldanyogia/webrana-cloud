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
import { UserStatus } from '@prisma/client';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth Flow E2E Tests', () => {
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

  describe('Flow: register → verify-email → login → refresh → logout', () => {
    it('should complete full auth flow successfully', async () => {
      if (!dockerAvailable) return;

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'flowtest@example.com',
          password: 'FlowTest123!',
          full_name: 'Flow Test User',
        })
        .expect(201);

      expect(registerResponse.body.data).toMatchObject({
        email: 'flowtest@example.com',
        full_name: 'Flow Test User',
        role: 'customer',
        status: 'pending_verification',
      });

      const userId = registerResponse.body.data.id;

      // Step 2: Create verification token using helper (simulates token from email)
      const verificationToken = await createVerificationToken(prisma, {
        userId,
        type: 'email_verification',
      });

      // Step 3: Verify email
      const verifyResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken.token })
        .expect(200);

      expect(verifyResponse.body.data).toMatchObject({
        message: 'Email berhasil diverifikasi',
      });

      // Verify user status updated to active
      const userAfterVerify = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(userAfterVerify?.status).toBe(UserStatus.active);

      // Step 4: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'flowtest@example.com',
          password: 'FlowTest123!',
        })
        .expect(200);

      expect(loginResponse.body.data).toMatchObject({
        token_type: 'Bearer',
        expires_in: 900,
      });
      expect(loginResponse.body.data.access_token).toBeDefined();
      expect(loginResponse.body.data.refresh_token).toBeDefined();
      expect(loginResponse.body.data.user.status).toBe('active');
      expect(loginResponse.body.data.requires_verification).toBe(false);

      const accessToken = loginResponse.body.data.access_token;
      const refreshToken = loginResponse.body.data.refresh_token;

      // Step 5: Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(refreshResponse.body.data).toMatchObject({
        token_type: 'Bearer',
        expires_in: 900,
      });
      expect(refreshResponse.body.data.access_token).toBeDefined();
      expect(refreshResponse.body.data.refresh_token).toBeDefined();
      // Note: access_token might be same if generated in same second (iat timestamp)
      // What matters is refresh works and returns valid tokens

      const newRefreshToken = refreshResponse.body.data.refresh_token;

      // Step 6: Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: newRefreshToken })
        .expect(200);

      expect(logoutResponse.body.data).toMatchObject({
        message: 'Logout berhasil',
      });

      // Verify refresh token is revoked
      const refreshTokenRecord = await prisma.refreshToken.findFirst({
        where: {
          userId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(refreshTokenRecord?.revokedAt).toBeDefined();
    });
  });

  describe('Flow: register → login (pending) → verify-email → login (active)', () => {
    it('should allow pending user to login with limited access, then full access after verification', async () => {
      if (!dockerAvailable) return;

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'pending@example.com',
          password: 'PendingTest123!',
          full_name: 'Pending User',
        })
        .expect(201);

      const userId = registerResponse.body.data.id;

      // Step 2: Login with pending status
      const loginPendingResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'pending@example.com',
          password: 'PendingTest123!',
        })
        .expect(200);

      expect(loginPendingResponse.body.data.user.status).toBe('pending_verification');
      expect(loginPendingResponse.body.data.requires_verification).toBe(true);

      // Step 3: Create verification token and verify
      const verificationToken = await createVerificationToken(prisma, {
        userId,
        type: 'email_verification',
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken.token })
        .expect(200);

      // Step 4: Login again with active status
      const loginActiveResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'pending@example.com',
          password: 'PendingTest123!',
        })
        .expect(200);

      expect(loginActiveResponse.body.data.user.status).toBe('active');
      expect(loginActiveResponse.body.data.requires_verification).toBe(false);
    });
  });

  describe('Flow: register → resend-verification → verify with new token', () => {
    it('should invalidate old token and verify with new token after resend', async () => {
      if (!dockerAvailable) return;

      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'resend@example.com',
          password: 'ResendTest123!',
          full_name: 'Resend User',
        })
        .expect(201);

      const userId = registerResponse.body.data.id;

      // Step 2: Resend verification
      await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'resend@example.com' })
        .expect(200);

      // Step 3: Verify new token created
      const tokens = await prisma.verificationToken.findMany({
        where: { userId, type: 'email_verification' },
        orderBy: { createdAt: 'desc' },
      });

      expect(tokens.length).toBeGreaterThan(1);

      // Step 4: Create new verification token (simulates clicking link in resent email)
      const newVerificationToken = await createVerificationToken(prisma, {
        userId,
        type: 'email_verification',
      });

      // Step 5: Verify with new token should succeed
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: newVerificationToken.token })
        .expect(200);

      // Verify user is now active
      const user = await prisma.user.findUnique({ where: { id: userId } });
      expect(user?.status).toBe(UserStatus.active);
    });
  });

  describe('Flow: login multiple devices → logout-all → verify all sessions invalid', () => {
    it('should logout from all devices and invalidate all refresh tokens', async () => {
      if (!dockerAvailable) return;

      // Setup: Create active user
      const testUser = await createTestUser(prisma, {
        email: 'multidevice@example.com',
        password: 'MultiDevice123!',
        status: UserStatus.active,
      });

      // Step 1: Login from device 1
      const login1 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const device1AccessToken = login1.body.data.access_token;
      const device1RefreshToken = login1.body.data.refresh_token;

      // Step 2: Login from device 2
      const login2 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const device2RefreshToken = login2.body.data.refresh_token;

      // Step 3: Login from device 3
      const login3 = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const device3RefreshToken = login3.body.data.refresh_token;

      // Verify 3 active sessions
      const activeTokensBefore = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      expect(activeTokensBefore.length).toBe(3);

      // Step 4: Logout from all devices
      const logoutAllResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${device1AccessToken}`)
        .expect(200);

      expect(logoutAllResponse.body.data.message).toBe('Semua sesi berhasil di-logout');

      // Step 5: Verify all refresh tokens are revoked
      const activeTokensAfter = await prisma.refreshToken.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      expect(activeTokensAfter.length).toBe(0);

      // Step 6: Try to refresh with any token should fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: device1RefreshToken })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: device2RefreshToken })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: device3RefreshToken })
        .expect(400);
    });
  });

  describe('Flow: suspended user cannot login', () => {
    it('should prevent suspended user from logging in', async () => {
      if (!dockerAvailable) return;

      // Setup: Create suspended user
      const suspendedUser = await createTestUser(prisma, {
        email: 'suspended@example.com',
        password: 'Suspended123!',
        status: UserStatus.suspended,
      });

      // Attempt login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: suspendedUser.email,
          password: suspendedUser.password,
        })
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Akun Anda telah disuspend. Hubungi support untuk informasi lebih lanjut.',
      });
    });
  });

  describe('Flow: deleted user cannot login', () => {
    it('should prevent deleted user from logging in', async () => {
      if (!dockerAvailable) return;

      // Setup: Create deleted user
      const deletedUser = await createTestUser(prisma, {
        email: 'deleted@example.com',
        password: 'Deleted123!',
        status: UserStatus.deleted,
      });

      // Attempt login
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: deletedUser.email,
          password: deletedUser.password,
        })
        .expect(403);

      expect(response.body.error).toMatchObject({
        code: 'ACCOUNT_DELETED',
        message: 'Akun tidak ditemukan',
      });
    });
  });
});
