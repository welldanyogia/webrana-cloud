/**
 * Security Test Helpers Index
 *
 * Re-exports all security testing utilities for convenient importing.
 */

export {
  generateTestToken,
  generateExpiredToken,
  generateTokenWithWrongSignature,
  generateTokenWithWrongAlgorithm,
  generateTokenWithIncorrectSigning,
  generateTokenWithNoneAlgorithm,
  createTestUser,
  createTestAdmin,
  TEST_JWT_SECRET,
  TEST_USERS,
  INTERNAL_API_KEY,
  MALFORMED_TOKENS,
  authHeader,
  apiKeyHeader,
  adminHeaders,
  type TestUser,
  type JwtPayload,
} from './auth';

export {
  SQL_INJECTION_PAYLOADS,
  XSS_PAYLOADS,
  NOSQL_INJECTION_PAYLOADS,
  PATH_TRAVERSAL_PAYLOADS,
  COMMAND_INJECTION_PAYLOADS,
  HEADER_INJECTION_PAYLOADS,
  generateOversizedPayload,
  generateLargeJsonPayload,
  generateDeeplyNestedJson,
  isPayloadSanitized,
} from './payloads';

export {
  generateTripaySignature,
  createTripayCallback,
  createWebhookWithInvalidSignature,
  createWebhookWithTamperedSignature,
  createWebhookWithOldTimestamp,
  createWebhookWithModifiedPayload,
  createDuplicateWebhooks,
  MALFORMED_SIGNATURES,
  type TripayCallbackPayload,
} from './webhooks';

export {
  sleep,
  measureResponseTime,
  triggerRateLimit,
  findRateLimitResponse,
  checkSecurityHeaders,
  checkErrorLeakage,
  checkCorsHeaders,
  checkUserEnumeration,
  isTimingSafe,
  randomString,
} from './utils';
