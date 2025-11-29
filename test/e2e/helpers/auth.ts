/**
 * E2E Test Authentication Helpers
 *
 * Provides utilities for generating and managing test user tokens
 * for E2E testing scenarios.
 */

import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// Test JWT secret (should match test environment configuration)
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-e2e';
const TEST_JWT_EXPIRES_IN = '1h';

// Internal API key for admin/internal endpoints
export const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY || 'test-internal-api-key';

export interface TestUser {
  id: string;
  email: string;
  fullName: string;
  role: 'customer' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Pre-configured test users for E2E tests
 */
export const TEST_USERS = {
  customer: {
    id: 'e2e-test-customer-' + uuidv4().substring(0, 8),
    email: 'e2e-customer@test.webrana.cloud',
    fullName: 'E2E Test Customer',
    role: 'customer' as const,
    status: 'active' as const,
  },
  admin: {
    id: 'e2e-test-admin-' + uuidv4().substring(0, 8),
    email: 'e2e-admin@test.webrana.cloud',
    fullName: 'E2E Test Admin',
    role: 'admin' as const,
    status: 'active' as const,
  },
};

/**
 * Generate a JWT token for a test user
 */
export function generateTestToken(user: TestUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn: TEST_JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Get test user token for customer role
 */
export function getTestUserToken(): string {
  return generateTestToken(TEST_USERS.customer);
}

/**
 * Get test admin token
 */
export function getTestAdminToken(): string {
  return generateTestToken(TEST_USERS.admin);
}

/**
 * Create a custom test user with token
 */
export function createTestUserWithToken(
  overrides: Partial<TestUser> = {}
): { user: TestUser; token: string } {
  const user: TestUser = {
    id: overrides.id || 'test-user-' + uuidv4().substring(0, 8),
    email: overrides.email || `test-${uuidv4().substring(0, 8)}@test.webrana.cloud`,
    fullName: overrides.fullName || 'Test User',
    role: overrides.role || 'customer',
    status: overrides.status || 'active',
  };

  return {
    user,
    token: generateTestToken(user),
  };
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, TEST_JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Generate an expired test token for testing token expiration handling
 */
export function generateExpiredToken(user: TestUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn: '-1h', // Already expired
    algorithm: 'HS256',
  });
}

/**
 * Generate an invalid token (wrong signature)
 */
export function generateInvalidToken(user: TestUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, 'wrong-secret', {
    expiresIn: TEST_JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Get the test user ID for customer
 */
export function getTestUserId(): string {
  return TEST_USERS.customer.id;
}

/**
 * Get the test admin ID
 */
export function getTestAdminId(): string {
  return TEST_USERS.admin.id;
}

/**
 * Authorization header helper
 */
export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * API Key header helper for internal endpoints
 */
export function apiKeyHeader(): { 'X-API-Key': string } {
  return { 'X-API-Key': INTERNAL_API_KEY };
}

/**
 * Combined headers for admin requests (both JWT and API Key)
 */
export function adminHeaders(token: string): {
  Authorization: string;
  'X-API-Key': string;
} {
  return {
    ...authHeader(token),
    ...apiKeyHeader(),
  };
}
