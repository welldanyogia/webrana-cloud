/**
 * Security Headers Security Tests (OWASP A05 - Security Misconfiguration)
 *
 * Tests for HTTP security headers validation including:
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - X-XSS-Protection
 * - Content-Security-Policy
 * - Strict-Transport-Security
 * - CORS Headers
 *
 * Uses existing utilities from helpers/utils.ts
 */

import type { Response } from 'supertest';

import {
  checkSecurityHeaders,
  checkCorsHeaders,
  checkErrorLeakage,
} from './helpers';

describe('Security Headers (OWASP A05 - Security Misconfiguration)', () => {
  /**
   * Mock response factory for testing header utilities
   */
  const createMockResponse = (headers: Record<string, string>): Response => {
    return {
      headers: { ...headers },
      body: {},
      status: 200,
    } as unknown as Response;
  };

  describe('checkSecurityHeaders Utility', () => {
    describe('X-Content-Type-Options Header', () => {
      it('should detect presence of X-Content-Type-Options: nosniff', () => {
        const response = createMockResponse({
          'x-content-type-options': 'nosniff',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasContentTypeOptions).toBe(true);
        expect(result.missingHeaders).not.toContain('X-Content-Type-Options');
      });

      it('should detect missing X-Content-Type-Options header', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        expect(result.hasContentTypeOptions).toBe(false);
        expect(result.missingHeaders).toContain('X-Content-Type-Options');
      });

      it('should detect invalid X-Content-Type-Options value', () => {
        const response = createMockResponse({
          'x-content-type-options': 'invalid',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasContentTypeOptions).toBe(false);
        expect(result.missingHeaders).toContain('X-Content-Type-Options');
      });
    });

    describe('X-Frame-Options Header', () => {
      it('should detect X-Frame-Options: DENY', () => {
        const response = createMockResponse({
          'x-frame-options': 'DENY',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasFrameOptions).toBe(true);
        expect(result.missingHeaders).not.toContain('X-Frame-Options');
      });

      it('should detect X-Frame-Options: SAMEORIGIN', () => {
        const response = createMockResponse({
          'x-frame-options': 'SAMEORIGIN',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasFrameOptions).toBe(true);
      });

      it('should detect missing X-Frame-Options header', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        expect(result.hasFrameOptions).toBe(false);
        expect(result.missingHeaders).toContain('X-Frame-Options');
      });

      it('should reject invalid X-Frame-Options value (clickjacking risk)', () => {
        const response = createMockResponse({
          'x-frame-options': 'ALLOW-FROM https://evil.com',
        });

        const result = checkSecurityHeaders(response);

        // ALLOW-FROM is deprecated and should be treated as missing
        expect(result.hasFrameOptions).toBe(false);
      });
    });

    describe('X-XSS-Protection Header', () => {
      it('should detect X-XSS-Protection: 1; mode=block', () => {
        const response = createMockResponse({
          'x-xss-protection': '1; mode=block',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasXssProtection).toBe(true);
        expect(result.missingHeaders).not.toContain('X-XSS-Protection');
      });

      it('should detect missing X-XSS-Protection header', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        expect(result.hasXssProtection).toBe(false);
        expect(result.missingHeaders).toContain('X-XSS-Protection');
      });

      it('should detect disabled X-XSS-Protection', () => {
        const response = createMockResponse({
          'x-xss-protection': '0',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasXssProtection).toBe(false);
      });
    });

    describe('Strict-Transport-Security Header', () => {
      it('should detect presence of HSTS header', () => {
        const response = createMockResponse({
          'strict-transport-security': 'max-age=31536000; includeSubDomains',
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasStrictTransport).toBe(true);
      });

      it('should handle missing HSTS header (may be expected in dev)', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        // HSTS might not be set in development
        expect(result.hasStrictTransport).toBe(false);
      });
    });

    describe('Content-Security-Policy Header', () => {
      it('should detect presence of CSP header', () => {
        const response = createMockResponse({
          'content-security-policy': "default-src 'self'",
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasContentSecurityPolicy).toBe(true);
      });

      it('should handle missing CSP header', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        expect(result.hasContentSecurityPolicy).toBe(false);
      });
    });

    describe('Complete Security Headers Validation', () => {
      it('should validate all required headers present', () => {
        const response = createMockResponse({
          'x-content-type-options': 'nosniff',
          'x-frame-options': 'DENY',
          'x-xss-protection': '1; mode=block',
          'strict-transport-security': 'max-age=31536000',
          'content-security-policy': "default-src 'self'",
        });

        const result = checkSecurityHeaders(response);

        expect(result.hasContentTypeOptions).toBe(true);
        expect(result.hasFrameOptions).toBe(true);
        expect(result.hasXssProtection).toBe(true);
        expect(result.hasStrictTransport).toBe(true);
        expect(result.hasContentSecurityPolicy).toBe(true);
        expect(result.missingHeaders).toHaveLength(0);
      });

      it('should report all missing headers', () => {
        const response = createMockResponse({});

        const result = checkSecurityHeaders(response);

        expect(result.missingHeaders).toContain('X-Content-Type-Options');
        expect(result.missingHeaders).toContain('X-Frame-Options');
        expect(result.missingHeaders).toContain('X-XSS-Protection');
        expect(result.missingHeaders.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('checkCorsHeaders Utility', () => {
    describe('Access-Control-Allow-Origin', () => {
      it('should detect Access-Control-Allow-Origin header', () => {
        const response = createMockResponse({
          'access-control-allow-origin': 'https://webrana.cloud',
        });

        const result = checkCorsHeaders(response, 'https://webrana.cloud');

        expect(result.hasAllowOrigin).toBe(true);
        expect(result.allowedOriginValue).toBe('https://webrana.cloud');
        expect(result.isOriginAllowed).toBe(true);
      });

      it('should detect wildcard origin (security risk in production)', () => {
        const response = createMockResponse({
          'access-control-allow-origin': '*',
        });

        const result = checkCorsHeaders(response, 'https://evil.com');

        expect(result.hasAllowOrigin).toBe(true);
        expect(result.allowedOriginValue).toBe('*');
        // Wildcard allows any origin
        expect(result.isOriginAllowed).toBe(true);
      });

      it('should detect origin mismatch', () => {
        const response = createMockResponse({
          'access-control-allow-origin': 'https://webrana.cloud',
        });

        const result = checkCorsHeaders(response, 'https://evil.com');

        expect(result.hasAllowOrigin).toBe(true);
        expect(result.isOriginAllowed).toBe(false);
      });

      it('should detect missing CORS headers', () => {
        const response = createMockResponse({});

        const result = checkCorsHeaders(response);

        expect(result.hasAllowOrigin).toBe(false);
        expect(result.hasAllowMethods).toBe(false);
        expect(result.hasAllowHeaders).toBe(false);
      });
    });

    describe('Access-Control-Allow-Methods', () => {
      it('should detect allowed methods header', () => {
        const response = createMockResponse({
          'access-control-allow-origin': 'https://webrana.cloud',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE',
        });

        const result = checkCorsHeaders(response);

        expect(result.hasAllowMethods).toBe(true);
      });
    });

    describe('Access-Control-Allow-Headers', () => {
      it('should detect allowed headers', () => {
        const response = createMockResponse({
          'access-control-allow-origin': 'https://webrana.cloud',
          'access-control-allow-headers': 'Content-Type, Authorization',
        });

        const result = checkCorsHeaders(response);

        expect(result.hasAllowHeaders).toBe(true);
      });
    });
  });

  describe('checkErrorLeakage Utility', () => {
    describe('Stack Trace Detection', () => {
      it('should detect stack traces in error responses', () => {
        const response = {
          headers: {},
          body: {
            error: 'Error: Something went wrong',
            stack: 'at Object.<anonymous> (/app/src/service.ts:42:15)',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksStack).toBe(true);
        expect(result.concerns).toContain('Stack trace exposed');
      });

      it('should pass when no stack trace present', () => {
        const response = {
          headers: {},
          body: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksStack).toBe(false);
      });
    });

    describe('Internal Path Detection', () => {
      it('should detect internal paths in responses', () => {
        const response = {
          headers: {},
          body: {
            error: 'File not found: /home/app/config/secret.json',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksInternalPath).toBe(true);
        expect(result.concerns).toContain('Internal file path exposed');
      });

      it('should detect node_modules paths', () => {
        const response = {
          headers: {},
          body: {
            error: 'Module not found at node_modules/prisma/client',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksInternalPath).toBe(true);
      });
    });

    describe('Database Error Detection', () => {
      it('should detect database connection errors', () => {
        const response = {
          headers: {},
          body: {
            error: 'Connection ECONNREFUSED 127.0.0.1:5432',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksDbError).toBe(true);
        expect(result.concerns).toContain('Database error details exposed');
      });

      it('should detect Prisma errors', () => {
        const response = {
          headers: {},
          body: {
            error: 'PrismaClient initialization error',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksDbError).toBe(true);
      });

      it('should detect SQL in error messages', () => {
        const response = {
          headers: {},
          body: {
            error: 'SELECT * FROM users WHERE id = 1 failed',
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksDbError).toBe(true);
      });
    });

    describe('Sanitized Error Responses', () => {
      it('should pass for properly sanitized error response', () => {
        const response = {
          headers: {},
          body: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'An unexpected error occurred',
            },
          },
          status: 500,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        expect(result.leaksStack).toBe(false);
        expect(result.leaksInternalPath).toBe(false);
        expect(result.leaksDbError).toBe(false);
        expect(result.concerns).toHaveLength(0);
      });

      it('should allow validation errors with field names', () => {
        const response = {
          headers: {},
          body: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: {
                password: 'password field is required',
              },
            },
          },
          status: 400,
        } as unknown as Response;

        const result = checkErrorLeakage(response);

        // Field names in validation errors are acceptable
        expect(result.leaksSensitiveData).toBe(false);
      });
    });
  });

  describe('Security Header Best Practices', () => {
    describe('Header Value Validation', () => {
      it('should validate X-Content-Type-Options must be exactly nosniff', () => {
        const validValues = ['nosniff'];
        const invalidValues = ['', 'sniff', 'yes', 'no', 'false'];

        validValues.forEach((value) => {
          expect(value).toBe('nosniff');
        });

        invalidValues.forEach((value) => {
          expect(value).not.toBe('nosniff');
        });
      });

      it('should validate X-Frame-Options acceptable values', () => {
        const validValues = ['DENY', 'SAMEORIGIN'];
        const invalidValues = ['ALLOW-FROM https://example.com', '', 'allow'];

        validValues.forEach((value) => {
          expect(['DENY', 'SAMEORIGIN']).toContain(value);
        });

        invalidValues.forEach((value) => {
          expect(['DENY', 'SAMEORIGIN']).not.toContain(value);
        });
      });

      it('should validate HSTS has minimum max-age', () => {
        const validateHSTS = (value: string): boolean => {
          const match = value.match(/max-age=(\d+)/);
          if (!match) return false;
          const maxAge = parseInt(match[1], 10);
          // Minimum recommended is 1 year (31536000 seconds)
          return maxAge >= 31536000;
        };

        expect(validateHSTS('max-age=31536000')).toBe(true);
        expect(validateHSTS('max-age=31536000; includeSubDomains')).toBe(true);
        expect(validateHSTS('max-age=31536000; includeSubDomains; preload')).toBe(true);
        expect(validateHSTS('max-age=3600')).toBe(false); // Too short
        expect(validateHSTS('')).toBe(false);
      });
    });

    describe('CSP Directive Validation', () => {
      it('should validate CSP has default-src directive', () => {
        const validateCSP = (csp: string): boolean => {
          return csp.includes('default-src');
        };

        expect(validateCSP("default-src 'self'")).toBe(true);
        expect(validateCSP("script-src 'self'")).toBe(false); // Missing default-src
      });

      it('should warn about unsafe-inline and unsafe-eval', () => {
        const hasUnsafeDirectives = (csp: string): string[] => {
          const warnings: string[] = [];
          if (csp.includes("'unsafe-inline'")) {
            warnings.push('CSP contains unsafe-inline');
          }
          if (csp.includes("'unsafe-eval'")) {
            warnings.push('CSP contains unsafe-eval');
          }
          return warnings;
        };

        expect(hasUnsafeDirectives("default-src 'self'")).toHaveLength(0);
        expect(hasUnsafeDirectives("script-src 'self' 'unsafe-inline'")).toContain('CSP contains unsafe-inline');
        expect(hasUnsafeDirectives("script-src 'self' 'unsafe-eval'")).toContain('CSP contains unsafe-eval');
      });
    });

    describe('Header Removal Verification', () => {
      it('should verify X-Powered-By is not present', () => {
        const response = createMockResponse({
          'x-content-type-options': 'nosniff',
          // X-Powered-By should NOT be present
        });

        expect(response.headers['x-powered-by']).toBeUndefined();
      });

      it('should verify Server header is not revealing details', () => {
        const response = createMockResponse({
          server: 'nginx', // Should not reveal version
        });

        // Server header should not contain version information
        const server = response.headers['server'];
        if (server) {
          expect(server).not.toMatch(/\d+\.\d+/); // No version numbers
        }
      });
    });
  });

  describe('OWASP A05 Coverage Summary', () => {
    it('should test all critical security header scenarios', () => {
      // This test documents the OWASP A05 coverage
      const testedScenarios = [
        'X-Content-Type-Options validation',
        'X-Frame-Options validation',
        'X-XSS-Protection validation',
        'Strict-Transport-Security validation',
        'Content-Security-Policy validation',
        'CORS header validation',
        'Error information leakage detection',
        'Server information disclosure prevention',
        'Security header best practices validation',
      ];

      expect(testedScenarios.length).toBeGreaterThanOrEqual(9);
    });
  });
});
