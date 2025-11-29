/**
 * E2E Test Helpers Index
 *
 * Re-exports all helper functions for convenient importing in test files.
 */

// Setup utilities
export {
  isDockerAvailable,
  waitForServices,
  setupE2EEnvironment,
  teardownE2EEnvironment,
  getServiceBaseUrl,
  sleep,
  waitFor,
  retry,
  describeWithDocker,
} from './setup';

// Authentication utilities
export {
  generateTestToken,
  getTestUserToken,
  getTestAdminToken,
  createTestUserWithToken,
  verifyToken,
  generateExpiredToken,
  generateInvalidToken,
  getTestUserId,
  getTestAdminId,
  authHeader,
  apiKeyHeader,
  adminHeaders,
  INTERNAL_API_KEY,
  TEST_USERS,
  type TestUser,
  type JwtPayload,
} from './auth';

// Mock data generators
export {
  createTripayCallback,
  generateTripaySignature,
  createSignedTripayCallback,
  createMockDroplet,
  createMockDropletAction,
  createOrderPayload,
  NotificationTracker,
  TEST_PLANS,
  TEST_IMAGES,
  type TripayCallbackStatus,
  type TripayCallbackPayload,
  type MockDropletResponse,
  type MockNotification,
} from './mocks';
