/**
 * Security Test Authentication Helpers
 *
 * Provides utilities for generating test tokens with various security scenarios
 * including valid, expired, malformed, and algorithm-confused tokens.
 */

import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * JWT signing value for test environment (env var or placeholder)
 * @see test/e2e/helpers/auth.ts for similar pattern
 */
export const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-signing-value';

/**
 * Internal endpoint authentication value for test environment
 * @see test/e2e/helpers/auth.ts for similar pattern
 */
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-auth-value';

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
 * Pre-configured test users for security tests
 */
export const TEST_USERS = {
  customer: {
    id: 'sec-test-customer-' + uuidv4().substring(0, 8),
    email: 'sec-customer@test.webrana.cloud',
    fullName: 'Security Test Customer',
    role: 'customer' as const,
    status: 'active' as const,
  },
  admin: {
    id: 'sec-test-admin-' + uuidv4().substring(0, 8),
    email: 'sec-admin@test.webrana.cloud',
    fullName: 'Security Test Admin',
    role: 'admin' as const,
    status: 'active' as const,
  },
  otherCustomer: {
    id: 'sec-test-other-' + uuidv4().substring(0, 8),
    email: 'sec-other@test.webrana.cloud',
    fullName: 'Security Test Other Customer',
    role: 'customer' as const,
    status: 'active' as const,
  },
};

/**
 * Generate a valid JWT token for a test user
 */
export function generateTestToken(user: TestUser, expiresIn: string = '1h'): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, TEST_JWT_SECRET, {
    expiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Generate an expired JWT token
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
 * Generate a token with wrong signature (tampered)
 */
export function generateTokenWithWrongSignature(user: TestUser): string {
  const validToken = generateTestToken(user);
  // Tamper with the signature part (last segment)
  const parts = validToken.split('.');
  const tamperedSignature = parts[2].split('').reverse().join('');
  return `${parts[0]}.${parts[1]}.${tamperedSignature}`;
}

/**
 * Generate a token signed with incorrect value
 */
export function generateTokenWithIncorrectSigning(user: TestUser): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, 'intentionally-wrong-value', {
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

/**
 * Generate a token using RS256 algorithm when HS256 is expected
 * (Algorithm Confusion Attack)
 */
export function generateTokenWithWrongAlgorithm(user: TestUser): string {
  // Generate RSA key pair
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, privateKey, {
    expiresIn: '1h',
    algorithm: 'RS256',
  });
}

/**
 * Generate a token with "none" algorithm (CVE attack vector)
 */
export function generateTokenWithNoneAlgorithm(user: TestUser): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  
  return `${header}.${payload}.`;
}

/**
 * Create a test user token helper
 */
export function createTestUser(): { user: TestUser; token: string } {
  const user = TEST_USERS.customer;
  return {
    user,
    token: generateTestToken(user),
  };
}

/**
 * Create a test admin token helper
 */
export function createTestAdmin(): { user: TestUser; token: string } {
  const user = TEST_USERS.admin;
  return {
    user,
    token: generateTestToken(user),
  };
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

/**
 * Generate malformed token variations
 */
export const MALFORMED_TOKENS = {
  empty: '',
  spaces: '   ',
  noDelimiter: 'notavalidjwttoken',
  onePart: 'header',
  twoParts: 'header.payload',
  invalidBase64: 'not@valid@base64.payload.signature',
  tooManyParts: 'header.payload.signature.extra',
  nullPayload: 'eyJhbGciOiJIUzI1NiJ9.null.signature',
};
