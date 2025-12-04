import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import request from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from '../../src/common/filters/throttler-exception.filter';
import { CustomThrottlerGuard } from '../../src/common/guards/custom-throttler.guard';
import { ThrottlerRedisStorage } from '../../src/common/throttler/throttler-redis-storage';
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

describe('Rate Limiting Integration Tests', () => {
  let app: INestApplication;
  let redisContainer: StartedTestContainer;
  let redisClient: Redis;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await isDockerAvailable();

    if (!dockerAvailable) {
      console.log('\n⚠️  Docker not available - integration tests will be skipped');
      console.log('   To run these tests, please start Docker Desktop\n');
      return;
    }

    // Start PostgreSQL database
    await startDatabase();

    // Start Redis container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();

    const redisUrl = `redis://${redisContainer.getHost()}:${redisContainer.getMappedPort(6379)}`;
    process.env.REDIS_URL = redisUrl;

    // Create Redis client for test cleanup
    redisClient = new Redis(redisUrl);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          // Use test environment variables
        }),
        ThrottlerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: () => ({
            throttlers: [
              {
                name: 'default',
                ttl: 60000, // 60 seconds
                limit: 5, // Default limit (will be overridden per endpoint)
              },
            ],
            storage: new ThrottlerRedisStorage(redisUrl),
          }),
        }),
        PrismaModule,
        AuthModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: CustomThrottlerGuard,
        },
        {
          provide: APP_FILTER,
          useClass: HttpExceptionFilter,
        },
        {
          provide: APP_FILTER,
          useClass: ThrottlerExceptionFilter,
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(getPrismaClient())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );
    app.setGlobalPrefix('api/v1/auth');
    await app.init();
  });

  afterAll(async () => {
    if (!dockerAvailable) return;

    if (redisClient) {
      await redisClient.quit();
    }
    if (app) {
      await app.close();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
    await stopDatabase();
  });

  afterEach(async () => {
    if (!dockerAvailable) return;

    // Clean up PostgreSQL database
    await cleanDatabase();

    // Clean up Redis to ensure test isolation
    if (redisClient) {
      await redisClient.flushall();
    }
  });

  describe('POST /login - Rate Limiting', () => {
    it('should allow 5 requests and block the 6th request with 429', async () => {
      if (!dockerAvailable) {
        console.log('Skipping test - Docker not available');
        return;
      }

      const loginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      // First 5 requests should succeed (or return 401 for invalid credentials)
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(loginDto);

        // Expect 401 Unauthorized (invalid credentials) not 429
        expect([401, 200]).toContain(response.status);
      }

      // 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(loginDto)
        .expect(429);

      // Verify error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toHaveProperty('message', 'Too many requests, please try again later.');
    });
  });

  describe('POST /register - Rate Limiting', () => {
    it('should allow 3 requests and block the 4th request with 429', async () => {
      if (!dockerAvailable) {
        console.log('Skipping test - Docker not available');
        return;
      }

      // First 3 requests should succeed or fail with business logic errors (not 429)
      for (let i = 0; i < 3; i++) {
        const registerDto = {
          email: `test${i}@example.com`,
          password: 'Password123!',
          full_name: `Test User ${i}`,
        };

        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/register')
          .send(registerDto);

        // Should not be rate limited
        expect(response.status).not.toBe(429);
      }

      // 4th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test3@example.com',
          password: 'Password123!',
          full_name: 'Test User 3',
        })
        .expect(429);

      // Verify error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toHaveProperty('message', 'Too many requests, please try again later.');
    });
  });

  describe('POST /forgot-password - Rate Limiting', () => {
    it('should allow 3 requests per email and block the 4th request with 429', async () => {
      if (!dockerAvailable) {
        console.log('Skipping test - Docker not available');
        return;
      }

      const forgotPasswordDto = {
        email: 'test@example.com',
      };

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send(forgotPasswordDto);

        // Should return 200 (even if email doesn't exist, for security)
        expect(response.status).not.toBe(429);
      }

      // 4th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send(forgotPasswordDto)
        .expect(429);

      // Verify error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toHaveProperty('message', 'Too many requests, please try again later.');
    });
  });

  describe('POST /resend-verification - Rate Limiting', () => {
    it('should allow 3 requests per email and block the 4th request with 429', async () => {
      if (!dockerAvailable) {
        console.log('Skipping test - Docker not available');
        return;
      }

      const resendDto = {
        email: 'test@example.com',
      };

      // First 3 requests should succeed or return business logic error (not 429)
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/resend-verification')
          .send(resendDto);

        expect(response.status).not.toBe(429);
      }

      // 4th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-verification')
        .send(resendDto)
        .expect(429);

      // Verify error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toHaveProperty('message', 'Too many requests, please try again later.');
    });
  });

  describe('Rate Limit Response Format', () => {
    it('should return proper error format for 429 responses', async () => {
      if (!dockerAvailable) {
        console.log('Skipping test - Docker not available');
        return;
      }

      // Trigger rate limit on login
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'format-test@example.com', password: 'pass' });
      }

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'format-test@example.com', password: 'pass' })
        .expect(429);

      // Verify structure
      expect(response.body).toEqual({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      });

      // Should NOT have any other fields
      expect(response.body.error).not.toHaveProperty('details');
      expect(response.body).not.toHaveProperty('statusCode');
      expect(response.body).not.toHaveProperty('message');
    });
  });
});
