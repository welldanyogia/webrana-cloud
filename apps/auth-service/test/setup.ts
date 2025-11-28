/**
 * Global test setup for auth-service
 * This file is loaded before all tests via setupFilesAfterEnv in jest.config.ts
 */

// Increase timeout for integration tests with containers
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.AUTH_JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.AUTH_JWT_ACCESS_EXPIRY = '15m';
process.env.AUTH_JWT_REFRESH_EXPIRY = '7d';
process.env.AUTH_JWT_ISSUER = 'webrana-cloud-test';
process.env.AUTH_PASSWORD_MIN_LENGTH = '8';
process.env.AUTH_PASSWORD_REQUIRE_UPPERCASE = 'true';
process.env.AUTH_PASSWORD_REQUIRE_LOWERCASE = 'true';
process.env.AUTH_PASSWORD_REQUIRE_DIGIT = 'true';
process.env.AUTH_PASSWORD_REQUIRE_SPECIAL = 'true';
process.env.AUTH_EMAIL_VERIFICATION_EXPIRY = '24h';
process.env.AUTH_PASSWORD_RESET_EXPIRY = '1h';

// Suppress console logs during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Global beforeAll - runs once before all test suites
beforeAll(async () => {
  // Add any global setup here
});

// Global afterAll - runs once after all test suites
afterAll(async () => {
  // Add any global cleanup here
});
