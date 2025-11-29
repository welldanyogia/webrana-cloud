import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../src/app/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/prisma/prisma.service';

// ============================================
// Test Environment Configuration
// ============================================
// These are intentional test fixtures, NOT real secrets
export const TEST_INTERNAL_API_KEY = process.env.TEST_INTERNAL_API_KEY || 'test-api-key-fixture';
export const TEST_USER_ID = 'user-test-123';

// Set internal API key
process.env.INTERNAL_API_KEY = TEST_INTERNAL_API_KEY;

// ============================================
// Test App State
// ============================================
let app: INestApplication | null = null;
let testModule: TestingModule | null = null;

export interface TestAppOptions {
  overrideProviders?: Array<{
    provide: any;
    useValue: any;
  }>;
}

/**
 * Create and configure the NestJS test application
 */
export async function createTestApp(options?: TestAppOptions): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleBuilder = Test.createTestingModule({
    imports: [AppModule],
  });

  // Apply provider overrides if specified
  if (options?.overrideProviders) {
    for (const override of options.overrideProviders) {
      moduleBuilder.overrideProvider(override.provide).useValue(override.useValue);
    }
  }

  testModule = await moduleBuilder.compile();
  app = testModule.createNestApplication();

  // Apply same global config as main.ts
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();

  const prisma = testModule.get<PrismaService>(PrismaService);

  return { app, prisma };
}

/**
 * Get the test module for accessing services directly
 */
export function getTestModule(): TestingModule | null {
  return testModule;
}

/**
 * Close and cleanup the test application
 */
export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    testModule = null;
  }
}

/**
 * Get HTTP server for supertest
 */
export function getHttpServer() {
  if (!app) {
    throw new Error('Test app not initialized. Call createTestApp() first.');
  }
  return app.getHttpServer();
}

/**
 * Create a test Prisma client for direct database access
 */
export function createTestPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });
}
