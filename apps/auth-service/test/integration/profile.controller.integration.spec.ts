import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserStatus } from '@prisma/client';
import request from 'supertest';

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  startDatabase,
  stopDatabase,
  cleanDatabase,
  getPrismaClient,
  isDockerAvailable,
} from '../helpers/test-database';
import { createTestUser } from '../helpers/test-fixtures';

describe('Profile Controller Integration Tests', () => {
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

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without authentication', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return user profile with authentication (200)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        email: 'profile@example.com',
        fullName: 'Profile User',
        status: UserStatus.active,
      });

      // Login to get token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Get profile
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(user.id);
      expect(response.body.data.email).toBe('profile@example.com');
      expect(response.body.data.full_name).toBe('Profile User');
      expect(response.body.data.role).toBeDefined();
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.timezone).toBeDefined();
      expect(response.body.data.language).toBeDefined();
    });

    it('should not expose password hash', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.password).toBeUndefined();
      expect(response.body.data.password_hash).toBeUndefined();
      expect(response.body.data.passwordHash).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/auth/me', () => {
    it('should return 401 without authentication', async () => {
      if (!dockerAvailable) return;

      await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .send({ full_name: 'New Name' })
        .expect(401);
    });

    it('should update profile successfully (200)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        fullName: 'Original Name',
        status: UserStatus.active,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      const response = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          full_name: 'Updated Name',
          phone_number: '+6281234567890',
          timezone: 'Asia/Jakarta',
          language: 'id',
        })
        .expect(200);

      expect(response.body.data.full_name).toBe('Updated Name');
      expect(response.body.data.phone_number).toBe('+6281234567890');
      expect(response.body.data.timezone).toBe('Asia/Jakarta');
      expect(response.body.data.language).toBe('id');

      // Verify in database
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.fullName).toBe('Updated Name');
      expect(updatedUser?.phoneNumber).toBe('+6281234567890');
    });

    it('should update only provided fields (partial update)', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        fullName: 'Original Name',
        phoneNumber: '+6281111111111',
        timezone: 'UTC',
        language: 'en',
        status: UserStatus.active,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Only update full_name
      const response = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ full_name: 'Only Name Changed' })
        .expect(200);

      expect(response.body.data.full_name).toBe('Only Name Changed');
      // Other fields should remain unchanged
      expect(response.body.data.phone_number).toBe('+6281111111111');
      expect(response.body.data.timezone).toBe('UTC');
      expect(response.body.data.language).toBe('en');
    });

    it('should not allow updating email or role', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, {
        email: 'original@example.com',
        status: UserStatus.active,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Try to update email (should be ignored or rejected)
      await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'hacked@example.com',
          role: 'super_admin',
          full_name: 'Valid Update',
        })
        .expect(200);

      // Verify email and role not changed
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.email).toBe('original@example.com');
      expect(updatedUser?.role).toBe('customer');
      expect(updatedUser?.fullName).toBe('Valid Update');
    });

    it('should handle empty update gracefully', async () => {
      if (!dockerAvailable) return;

      const prisma = getPrismaClient();
      const user = await createTestUser(prisma, { status: UserStatus.active });

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);

      const accessToken = loginResponse.body.data.access_token;

      // Empty update should still return 200 with current data
      const response = await request(app.getHttpServer())
        .patch('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);

      expect(response.body.data.id).toBe(user.id);
    });
  });
});
