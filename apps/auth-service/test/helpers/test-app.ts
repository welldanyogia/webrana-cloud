import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

/**
 * Creates a NestJS test application with common configuration
 * Used for integration and E2E tests
 */
export async function createTestApp(
  moduleImports: any[],
  providers: any[] = []
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: path.join(__dirname, '../../.env.test'),
        ignoreEnvFile: true, // Use process.env from setup.ts
      }),
      ...moduleImports,
    ],
    providers,
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same pipes as production
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

  // Set global prefix
  app.setGlobalPrefix('api/v1/auth');

  await app.init();
  return app;
}

/**
 * Creates a minimal test module for unit tests
 */
export async function createTestModule(
  providers: any[],
  imports: any[] = []
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
      }),
      ...imports,
    ],
    providers,
  }).compile();
}

/**
 * Helper to create mock ConfigService
 */
export function createMockConfigService(overrides: Record<string, any> = {}) {
  const defaults: Record<string, any> = {
    AUTH_JWT_SECRET: 'test-jwt-secret-key-minimum-32-characters-long',
    AUTH_JWT_ACCESS_EXPIRY: '15m',
    AUTH_JWT_REFRESH_EXPIRY: '7d',
    AUTH_JWT_ISSUER: 'webrana-cloud-test',
    AUTH_PASSWORD_MIN_LENGTH: 8,
    AUTH_PASSWORD_REQUIRE_UPPERCASE: 'true',
    AUTH_PASSWORD_REQUIRE_LOWERCASE: 'true',
    AUTH_PASSWORD_REQUIRE_DIGIT: 'true',
    AUTH_PASSWORD_REQUIRE_SPECIAL: 'true',
    AUTH_EMAIL_VERIFICATION_EXPIRY: '24h',
    AUTH_PASSWORD_RESET_EXPIRY: '1h',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      return defaults[key] !== undefined ? defaults[key] : defaultValue;
    }),
  };
}
