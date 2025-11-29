/**
 * Security Test Utility Helpers
 *
 * General utilities for security testing including timing,
 * rate limit testing, and response analysis.
 */

import type { Response } from 'supertest';

/**
 * Sleep utility for timing-based tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Measure response time for an async function
 */
export async function measureResponseTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  
  return {
    result,
    durationMs: endTime - startTime,
  };
}

/**
 * Trigger rate limit by making multiple requests
 */
export async function triggerRateLimit(
  makeRequest: () => Promise<Response>,
  requestCount: number = 10,
  delayBetweenRequestsMs: number = 0
): Promise<Response[]> {
  const responses: Response[] = [];
  
  for (let i = 0; i < requestCount; i++) {
    const response = await makeRequest();
    responses.push(response);
    
    if (delayBetweenRequestsMs > 0 && i < requestCount - 1) {
      await sleep(delayBetweenRequestsMs);
    }
  }
  
  return responses;
}

/**
 * Find the first 429 response in a list of responses
 */
export function findRateLimitResponse(responses: Response[]): Response | undefined {
  return responses.find((r) => r.status === 429);
}

/**
 * Check if response headers contain required security headers
 */
export function checkSecurityHeaders(response: Response): {
  hasContentTypeOptions: boolean;
  hasFrameOptions: boolean;
  hasXssProtection: boolean;
  hasStrictTransport: boolean;
  hasContentSecurityPolicy: boolean;
  missingHeaders: string[];
} {
  const headers = response.headers;
  const missingHeaders: string[] = [];

  const hasContentTypeOptions = headers['x-content-type-options'] === 'nosniff';
  if (!hasContentTypeOptions) missingHeaders.push('X-Content-Type-Options');

  const hasFrameOptions = ['DENY', 'SAMEORIGIN'].includes(headers['x-frame-options']);
  if (!hasFrameOptions) missingHeaders.push('X-Frame-Options');

  const hasXssProtection = headers['x-xss-protection'] === '1; mode=block';
  if (!hasXssProtection) missingHeaders.push('X-XSS-Protection');

  const hasStrictTransport = !!headers['strict-transport-security'];
  // HSTS might not be set in dev/test environments

  const hasContentSecurityPolicy = !!headers['content-security-policy'];
  // CSP might not be set in all responses

  return {
    hasContentTypeOptions,
    hasFrameOptions,
    hasXssProtection,
    hasStrictTransport,
    hasContentSecurityPolicy,
    missingHeaders,
  };
}

/**
 * Check if error response leaks sensitive information
 */
export function checkErrorLeakage(response: Response): {
  leaksStack: boolean;
  leaksInternalPath: boolean;
  leaksDbError: boolean;
  leaksSensitiveData: boolean;
  concerns: string[];
} {
  const body = typeof response.body === 'string' 
    ? response.body 
    : JSON.stringify(response.body);
  
  const concerns: string[] = [];
  
  // Check for stack traces
  const leaksStack = /at .+\.(js|ts):\d+:\d+/i.test(body) || 
                     body.includes('Error:') && body.includes('at ');
  if (leaksStack) concerns.push('Stack trace exposed');

  // Check for internal paths
  const leaksInternalPath = /\/home\/|\/var\/|\/usr\/|node_modules/i.test(body);
  if (leaksInternalPath) concerns.push('Internal file path exposed');

  // Check for database errors
  const leaksDbError = /ECONNREFUSED|ER_|PrismaClient|PostgreSQL|SELECT|INSERT|UPDATE/i.test(body);
  if (leaksDbError) concerns.push('Database error details exposed');

  // Check for sensitive data patterns
  const leaksSensitiveData = /password|secret|api[_-]?key|token|credential/i.test(body) &&
                              !body.includes('error') && // Allow error codes like INVALID_PASSWORD
                              !body.includes('field');   // Allow field names in validation errors
  if (leaksSensitiveData) concerns.push('Potential sensitive data exposure');

  return {
    leaksStack,
    leaksInternalPath,
    leaksDbError,
    leaksSensitiveData,
    concerns,
  };
}

/**
 * Validate that response time is within acceptable bounds
 * (helps detect timing attacks)
 */
export function isTimingSafe(
  validCredentialTimeMs: number,
  invalidCredentialTimeMs: number,
  toleranceMs: number = 100
): boolean {
  return Math.abs(validCredentialTimeMs - invalidCredentialTimeMs) < toleranceMs;
}

/**
 * Generate random string for unique identifiers
 */
export function randomString(length: number = 8): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Check if CORS headers are properly configured
 */
export function checkCorsHeaders(
  response: Response,
  allowedOrigin?: string
): {
  hasAllowOrigin: boolean;
  hasAllowMethods: boolean;
  hasAllowHeaders: boolean;
  allowedOriginValue: string | undefined;
  isOriginAllowed: boolean;
} {
  const headers = response.headers;
  
  const allowedOriginValue = headers['access-control-allow-origin'];
  const hasAllowOrigin = !!allowedOriginValue;
  const hasAllowMethods = !!headers['access-control-allow-methods'];
  const hasAllowHeaders = !!headers['access-control-allow-headers'];
  
  const isOriginAllowed = allowedOrigin 
    ? allowedOriginValue === allowedOrigin || allowedOriginValue === '*'
    : false;

  return {
    hasAllowOrigin,
    hasAllowMethods,
    hasAllowHeaders,
    allowedOriginValue,
    isOriginAllowed,
  };
}

/**
 * Test response for user enumeration vulnerability
 */
export function checkUserEnumeration(
  existingUserResponse: Response,
  nonExistingUserResponse: Response
): {
  vulnerable: boolean;
  reason?: string;
} {
  // Check if error messages differ
  const existingBody = JSON.stringify(existingUserResponse.body);
  const nonExistingBody = JSON.stringify(nonExistingUserResponse.body);
  
  if (existingUserResponse.status !== nonExistingUserResponse.status) {
    return {
      vulnerable: true,
      reason: `Different status codes: ${existingUserResponse.status} vs ${nonExistingUserResponse.status}`,
    };
  }
  
  // Check for different error messages that might reveal user existence
  if (existingBody.includes('User not found') || 
      nonExistingBody.includes('User not found')) {
    return {
      vulnerable: true,
      reason: 'Error message reveals user existence',
    };
  }
  
  if (existingBody.includes('Invalid password') || 
      nonExistingBody.includes('Invalid password')) {
    return {
      vulnerable: true,
      reason: 'Error message distinguishes between invalid user and invalid password',
    };
  }
  
  return { vulnerable: false };
}
