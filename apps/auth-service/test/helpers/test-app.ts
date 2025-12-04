import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

import { AppModule } from '../../src/app/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { SanitizePipe } from '../../src/common/pipes/sanitize.pipe';
import { ThrottlerRedisStorage } from '../../src/common/throttler/throttler-redis-storage';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Creates a test NestJS application with the same configuration as main.ts
 * Includes: helmet security headers, custom middleware, SanitizePipe, ValidationPipe
 * 
 * Note: PrismaService and ThrottlerRedisStorage are mocked to avoid external dependencies
 */
export async function createTestApp(): Promise<INestApplication> {
  // Mock PrismaService to avoid database connection
  const mockPrismaService = {
    user: {},
    refreshToken: {},
    verificationToken: {},
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
  };

  // Mock ThrottlerRedisStorage to avoid Redis connection
  const mockThrottlerStorage: ThrottlerStorage = {
    increment: jest.fn().mockResolvedValue({
      totalHits: 1,
      timeToExpire: 60000,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  } as any; // Cast to any to avoid method signature mismatches

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      // ThrottlerModule needed for THROTTLER:MODULE_OPTIONS provider
      ThrottlerModule.forRoot([
        {
          ttl: 60000,
          limit: 1000, // High limit to not interfere with tests
        },
      ]),
      AppModule,
    ],
    providers: [
      {
        provide: APP_FILTER,
        useClass: HttpExceptionFilter,
      },
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(mockPrismaService)
    .overrideProvider(ThrottlerRedisStorage)
    .useValue(mockThrottlerStorage)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Global prefix (same as main.ts)
  app.setGlobalPrefix('api/v1/auth');

  // === SECURITY HEADERS - SAME AS main.ts ===
  app.use(
    helmet({
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      contentSecurityPolicy: false,
    })
  );

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // === GLOBAL PIPES (Sanitize + Validation) ===
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  await app.init();
  return app;
}
