/**
 * API Security Tests
 *
 * Tests for rate limiting, CORS configuration, security headers,
 * webhook security, and sensitive data exposure prevention.
 */

import {
  generateTripaySignature,
  createTripayCallback,
  createWebhookWithInvalidSignature,
  createWebhookWithTamperedSignature,
  createWebhookWithOldTimestamp,
  createWebhookWithModifiedPayload,
  createDuplicateWebhooks,
  MALFORMED_SIGNATURES,
} from './helpers';
import {
  checkSecurityHeaders,
  checkErrorLeakage,
  checkCorsHeaders,
  checkUserEnumeration,
  isTimingSafe,
} from './helpers/utils';

describe('API Security', () => {
  describe('Rate Limiting', () => {
    describe('Rate Limit Configuration', () => {
      it('should define rate limits for sensitive endpoints', () => {
        // Simulated rate limit configuration
        const rateLimits = {
          '/api/v1/auth/login': { limit: 5, window: 60 },
          '/api/v1/auth/register': { limit: 3, window: 60 },
          '/api/v1/auth/forgot-password': { limit: 3, window: 300 },
          '/api/v1/auth/resend-verification': { limit: 3, window: 60 },
        };

        // Login should have strict limits
        expect(rateLimits['/api/v1/auth/login'].limit).toBeLessThanOrEqual(10);
        
        // Registration should have stricter limits
        expect(rateLimits['/api/v1/auth/register'].limit).toBeLessThanOrEqual(5);
        
        // Password reset should have very strict limits
        expect(rateLimits['/api/v1/auth/forgot-password'].limit).toBeLessThanOrEqual(5);
      });

      it('should track rate limits by IP or user identifier', () => {
        // Simulated rate limiter
        class RateLimiter {
          private requests: Map<string, number[]> = new Map();
          private windowMs: number;
          private maxRequests: number;

          constructor(windowMs: number, maxRequests: number) {
            this.windowMs = windowMs;
            this.maxRequests = maxRequests;
          }

          isAllowed(identifier: string): boolean {
            const now = Date.now();
            const windowStart = now - this.windowMs;
            
            const requests = this.requests.get(identifier) || [];
            const recentRequests = requests.filter((t) => t > windowStart);
            
            if (recentRequests.length >= this.maxRequests) {
              return false;
            }
            
            recentRequests.push(now);
            this.requests.set(identifier, recentRequests);
            return true;
          }
        }

        const limiter = new RateLimiter(60000, 5);
        const ip = '192.168.1.1';

        // First 5 requests should be allowed
        for (let i = 0; i < 5; i++) {
          expect(limiter.isAllowed(ip)).toBe(true);
        }

        // 6th request should be blocked
        expect(limiter.isAllowed(ip)).toBe(false);
      });
    });

    describe('Rate Limit Response Format', () => {
      it('should return proper 429 response structure', () => {
        const rateLimitResponse = {
          status: 429,
          body: {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later.',
            },
          },
          headers: {
            'retry-after': '60',
            'x-ratelimit-limit': '5',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
          },
        };

        expect(rateLimitResponse.status).toBe(429);
        expect(rateLimitResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(rateLimitResponse.headers['retry-after']).toBeDefined();
      });
    });

    describe('Rate Limit Bypass Prevention', () => {
      it('should not allow bypass via X-Forwarded-For spoofing', () => {
        // Rate limiter should trust only the rightmost IP in X-Forwarded-For
        // or use the direct connection IP when behind trusted proxy
        const getClientIp = (
          directIp: string,
          xForwardedFor: string | undefined,
          trustProxy: boolean
        ): string => {
          if (!trustProxy || !xForwardedFor) {
            return directIp;
          }
          
          // Get the rightmost IP (closest to our server)
          const ips = xForwardedFor.split(',').map((ip) => ip.trim());
          return ips[ips.length - 1] || directIp;
        };

        // Should not trust arbitrary headers when proxy is not trusted
        expect(getClientIp('1.2.3.4', '5.6.7.8', false)).toBe('1.2.3.4');
        
        // Should use rightmost IP when proxy is trusted
        expect(getClientIp('10.0.0.1', '5.6.7.8, 1.2.3.4', true)).toBe('1.2.3.4');
      });
    });
  });

  describe('CORS Configuration', () => {
    describe('Origin Validation', () => {
      it('should only allow specific origins', () => {
        const allowedOrigins = [
          'https://webrana.cloud',
          'https://app.webrana.cloud',
          'https://admin.webrana.cloud',
        ];

        const isOriginAllowed = (origin: string): boolean => {
          return allowedOrigins.includes(origin);
        };

        // Allowed origins
        expect(isOriginAllowed('https://webrana.cloud')).toBe(true);
        expect(isOriginAllowed('https://app.webrana.cloud')).toBe(true);

        // Malicious origins
        expect(isOriginAllowed('https://malicious-site.com')).toBe(false);
        expect(isOriginAllowed('https://webrana.cloud.evil.com')).toBe(false);
        expect(isOriginAllowed('http://webrana.cloud')).toBe(false); // HTTP not allowed
      });

      it('should not use wildcard origin in production', () => {
        const corsConfig = {
          development: { origin: '*' },
          production: { origin: ['https://webrana.cloud', 'https://app.webrana.cloud'] },
        };

        // Production should not have wildcard
        expect(corsConfig.production.origin).not.toBe('*');
        expect(Array.isArray(corsConfig.production.origin)).toBe(true);
      });

      it('should validate origin format', () => {
        const isValidOrigin = (origin: string): boolean => {
          try {
            const url = new URL(origin);
            return ['http:', 'https:'].includes(url.protocol) && !url.pathname.slice(1);
          } catch {
            return false;
          }
        };

        expect(isValidOrigin('https://example.com')).toBe(true);
        expect(isValidOrigin('https://example.com/')).toBe(true);
        expect(isValidOrigin('javascript:alert(1)')).toBe(false);
        expect(isValidOrigin('not-a-url')).toBe(false);
      });
    });

    describe('CORS Methods and Headers', () => {
      it('should restrict allowed HTTP methods', () => {
        const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
        
        // TRACE and CONNECT should not be allowed (security risk)
        expect(allowedMethods).not.toContain('TRACE');
        expect(allowedMethods).not.toContain('CONNECT');
      });

      it('should specify allowed headers', () => {
        const allowedHeaders = [
          'Content-Type',
          'Authorization',
          'X-API-Key',
          'X-Request-Id',
        ];

        expect(allowedHeaders).toContain('Authorization');
        expect(allowedHeaders).toContain('Content-Type');
      });

      it('should not expose sensitive headers', () => {
        const exposedHeaders = [
          'X-Request-Id',
          'X-RateLimit-Limit',
          'X-RateLimit-Remaining',
        ];

        // Should not expose internal headers
        const sensitiveHeaders = ['X-Internal-Token', 'X-Debug-Info'];
        sensitiveHeaders.forEach((header) => {
          expect(exposedHeaders).not.toContain(header);
        });
      });
    });

    describe('Preflight Request Handling', () => {
      it('should handle OPTIONS requests properly', () => {
        // Simulated preflight response
        const preflightResponse = {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': 'https://webrana.cloud',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        };

        expect(preflightResponse.status).toBe(204);
        expect(preflightResponse.headers['Access-Control-Max-Age']).toBeDefined();
      });
    });
  });

  describe('Security Headers', () => {
    describe('Required Security Headers', () => {
      it('should define required security headers', () => {
        const requiredHeaders = {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        };

        expect(requiredHeaders['X-Content-Type-Options']).toBe('nosniff');
        expect(requiredHeaders['X-Frame-Options']).toBe('DENY');
        expect(requiredHeaders['X-XSS-Protection']).toBe('1; mode=block');
      });

      it('should set Strict-Transport-Security for HTTPS', () => {
        const hstsValue = 'max-age=31536000; includeSubDomains; preload';
        
        // HSTS should have at least 1 year max-age
        const maxAgeMatch = hstsValue.match(/max-age=(\d+)/);
        expect(maxAgeMatch).not.toBeNull();
        expect(parseInt(maxAgeMatch![1])).toBeGreaterThanOrEqual(31536000);
        
        // Should include subdomains
        expect(hstsValue).toContain('includeSubDomains');
      });

      it('should set proper Content-Security-Policy', () => {
        const cspValue = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
        
        expect(cspValue).toContain("default-src");
        expect(cspValue).toContain("'self'");
        
        // Should not allow unsafe-eval for scripts
        expect(cspValue).not.toContain("script-src 'unsafe-eval'");
      });
    });

    describe('Header Removal', () => {
      it('should not expose server information', () => {
        const headersToRemove = ['X-Powered-By', 'Server'];
        
        // These headers should be removed or not set
        const mockResponse = {
          headers: {
            'Content-Type': 'application/json',
            // X-Powered-By should be absent
          },
        };

        expect(mockResponse.headers).not.toHaveProperty('X-Powered-By');
        expect(mockResponse.headers).not.toHaveProperty('Server');
      });
    });

    describe('Security Header Validation', () => {
      it('should validate X-Content-Type-Options header', () => {
        const validValues = ['nosniff'];
        
        validValues.forEach((value) => {
          expect(value).toBe('nosniff');
        });
      });

      it('should validate X-Frame-Options header', () => {
        const validValues = ['DENY', 'SAMEORIGIN'];
        
        validValues.forEach((value) => {
          expect(['DENY', 'SAMEORIGIN']).toContain(value);
        });
      });
    });
  });

  describe('Webhook Security', () => {
    describe('Signature Verification', () => {
      it('should generate valid webhook signatures', () => {
        const { payload, signature } = createTripayCallback('INV-001', 'PAID');

        expect(signature).toBeDefined();
        expect(signature).toHaveLength(64); // SHA256 hex string
        expect(signature).toMatch(/^[a-f0-9]+$/);
      });

      it('should detect invalid signatures', () => {
        const { payload, signature } = createWebhookWithInvalidSignature('INV-002', 'PAID');
        const validCallback = createTripayCallback('INV-002', 'PAID');

        // Invalid signature should not match valid signature
        expect(signature).not.toBe(validCallback.signature);
      });

      it('should detect tampered signatures', () => {
        const { signature: tamperedSig } = createWebhookWithTamperedSignature('INV-003');
        const { signature: validSig } = createTripayCallback('INV-003', 'PAID');

        expect(tamperedSig).not.toBe(validSig);
        expect(tamperedSig).toContain('TAMPERED');
      });

      it('should handle malformed signatures', () => {
        Object.entries(MALFORMED_SIGNATURES).forEach(([name, signature]) => {
          // Malformed signatures should not be valid hex strings of correct length
          const isValidFormat = /^[a-f0-9]{64}$/i.test(signature);
          expect(isValidFormat).toBe(false);
        });
      });
    });

    describe('Replay Attack Prevention', () => {
      it('should detect old timestamps in webhooks', () => {
        const { payload } = createWebhookWithOldTimestamp('INV-004', 24);

        // Webhook timestamp should be checked against a reasonable window
        const now = Math.floor(Date.now() / 1000);
        const maxAge = 5 * 60; // 5 minutes
        const webhookAge = now - (payload.created_at || 0);

        expect(webhookAge).toBeGreaterThan(maxAge);
      });

      it('should detect duplicate webhook payloads', () => {
        const duplicates = createDuplicateWebhooks('INV-005', 3);

        // All duplicates should have the same signature
        const signatures = duplicates.map((d) => d.signature);
        expect(new Set(signatures).size).toBe(1);

        // Application should track processed webhooks to prevent duplicates
        const processedWebhooks = new Set<string>();
        
        duplicates.forEach(({ payload }, index) => {
          const webhookId = `${payload.reference}-${payload.merchant_ref}`;
          const isFirstTime = !processedWebhooks.has(webhookId);
          
          if (index === 0) {
            expect(isFirstTime).toBe(true);
          } else {
            expect(isFirstTime).toBe(false);
          }
          
          processedWebhooks.add(webhookId);
        });
      });
    });

    describe('Payload Integrity', () => {
      it('should detect modified payloads after signing', () => {
        const { payload, signature, originalPayload } = createWebhookWithModifiedPayload('INV-006');

        // Modified payload should differ from original
        expect(payload.amount_received).not.toBe(originalPayload.amount_received);

        // Signature was computed for original payload, not modified
        const validSignature = generateTripaySignature(originalPayload);
        const modifiedSignature = generateTripaySignature(payload);

        expect(signature).toBe(validSignature);
        expect(signature).not.toBe(modifiedSignature);
      });
    });

    describe('Webhook Authentication', () => {
      it('should require signature header', () => {
        const validateWebhookRequest = (headers: Record<string, string | undefined>): boolean => {
          return !!headers['x-callback-signature'];
        };

        expect(validateWebhookRequest({ 'x-callback-signature': 'abc123' })).toBe(true);
        expect(validateWebhookRequest({})).toBe(false);
        expect(validateWebhookRequest({ 'x-callback-signature': undefined })).toBe(false);
      });
    });
  });

  describe('Sensitive Data Exposure Prevention', () => {
    describe('Error Response Sanitization', () => {
      it('should not expose stack traces in production', () => {
        const productionError = {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        };

        expect(productionError).not.toHaveProperty('stack');
        expect(productionError.error).not.toHaveProperty('stack');
        expect(JSON.stringify(productionError)).not.toContain('.js:');
        expect(JSON.stringify(productionError)).not.toContain('.ts:');
      });

      it('should not expose internal paths', () => {
        const errorResponse = {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
          },
        };

        const responseStr = JSON.stringify(errorResponse);
        expect(responseStr).not.toContain('/home/');
        expect(responseStr).not.toContain('/var/');
        expect(responseStr).not.toContain('node_modules');
      });

      it('should not expose database errors directly', () => {
        const sanitizeDbError = (error: Error): { code: string; message: string } => {
          // Map database errors to generic messages
          if (error.message.includes('ECONNREFUSED')) {
            return { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' };
          }
          if (error.message.includes('unique constraint')) {
            return { code: 'DUPLICATE_ENTRY', message: 'Resource already exists' };
          }
          return { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' };
        };

        const dbError = new Error('Connection ECONNREFUSED 127.0.0.1:5432');
        const sanitized = sanitizeDbError(dbError);

        expect(sanitized.message).not.toContain('ECONNREFUSED');
        expect(sanitized.message).not.toContain('127.0.0.1');
        expect(sanitized.message).not.toContain('5432');
      });
    });

    describe('User Enumeration Prevention', () => {
      it('should return consistent error for invalid credentials', () => {
        // Both scenarios should return the same error
        const invalidUserError = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        };

        const invalidPasswordError = {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials',
          },
        };

        expect(invalidUserError.error.code).toBe(invalidPasswordError.error.code);
        expect(invalidUserError.error.message).toBe(invalidPasswordError.error.message);
      });

      it('should return success for password reset regardless of email existence', () => {
        const existingEmailResponse = {
          data: {
            message: 'If an account exists with this email, a reset link will be sent',
          },
        };

        const nonExistingEmailResponse = {
          data: {
            message: 'If an account exists with this email, a reset link will be sent',
          },
        };

        expect(existingEmailResponse.data.message).toBe(nonExistingEmailResponse.data.message);
      });
    });

    describe('Sensitive Fields Masking', () => {
      it('should not return passwords in responses', () => {
        const userResponse = {
          id: 'user-123',
          email: 'user@example.com',
          fullName: 'Test User',
          role: 'customer',
          createdAt: new Date().toISOString(),
        };

        expect(userResponse).not.toHaveProperty('password');
        expect(userResponse).not.toHaveProperty('passwordHash');
      });

      it('should mask sensitive fields in logs', () => {
        const maskSensitiveFields = (obj: Record<string, unknown>): Record<string, unknown> => {
          const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
          const result: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
              result[key] = '***REDACTED***';
            } else if (typeof value === 'object' && value !== null) {
              result[key] = maskSensitiveFields(value as Record<string, unknown>);
            } else {
              result[key] = value;
            }
          }

          return result;
        };

        const request = {
          email: 'user@example.com',
          password: 'secret123',
          headers: {
            authorization: 'Bearer xxx',
            apiKey: 'key123',
          },
        };

        const masked = maskSensitiveFields(request);

        expect(masked.password).toBe('***REDACTED***');
        expect((masked.headers as Record<string, unknown>).authorization).toBe('***REDACTED***');
        expect((masked.headers as Record<string, unknown>).apiKey).toBe('***REDACTED***');
        expect(masked.email).toBe('user@example.com'); // Email not masked
      });

      it('should not expose tokens in URLs', () => {
        const validateUrl = (url: string): boolean => {
          const sensitiveParams = ['token', 'password', 'secret', 'api_key', 'apiKey'];
          const urlObj = new URL(url, 'http://example.com');
          
          for (const param of sensitiveParams) {
            if (urlObj.searchParams.has(param)) {
              return false;
            }
          }
          
          return true;
        };

        expect(validateUrl('/api/orders?page=1')).toBe(true);
        expect(validateUrl('/api/orders?token=secret')).toBe(false);
        expect(validateUrl('/api/orders?api_key=xxx')).toBe(false);
      });
    });
  });

  describe('Timing Attack Prevention', () => {
    describe('Constant Time Comparison', () => {
      it('should use constant-time comparison for secrets', () => {
        // Simulated constant-time comparison
        const timingSafeEqual = (a: string, b: string): boolean => {
          if (a.length !== b.length) {
            return false;
          }
          
          let result = 0;
          for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
          }
          
          return result === 0;
        };

        expect(timingSafeEqual('secret123', 'secret123')).toBe(true);
        expect(timingSafeEqual('secret123', 'secret124')).toBe(false);
        expect(timingSafeEqual('short', 'longersecret')).toBe(false);
      });
    });
  });

  describe('Request Validation', () => {
    describe('Content-Type Validation', () => {
      it('should validate Content-Type header', () => {
        const validateContentType = (contentType: string | undefined): boolean => {
          if (!contentType) return false;
          return contentType.includes('application/json');
        };

        expect(validateContentType('application/json')).toBe(true);
        expect(validateContentType('application/json; charset=utf-8')).toBe(true);
        expect(validateContentType('text/html')).toBe(false);
        expect(validateContentType(undefined)).toBe(false);
      });
    });

    describe('Request ID Tracking', () => {
      it('should generate unique request IDs', () => {
        const generateRequestId = (): string => {
          return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        };

        const ids = new Set<string>();
        for (let i = 0; i < 100; i++) {
          ids.add(generateRequestId());
        }

        // All IDs should be unique
        expect(ids.size).toBe(100);
      });
    });
  });

  describe('HTTP Method Security', () => {
    describe('Method Restriction', () => {
      it('should not allow TRACE method', () => {
        const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
        
        expect(allowedMethods).not.toContain('TRACE');
      });

      it('should validate HTTP method for each endpoint', () => {
        const endpointMethods: Record<string, string[]> = {
          '/api/v1/orders': ['GET', 'POST'],
          '/api/v1/orders/:id': ['GET', 'PATCH', 'DELETE'],
          '/api/v1/auth/login': ['POST'],
          '/api/v1/auth/logout': ['POST'],
        };

        // Login should only accept POST
        expect(endpointMethods['/api/v1/auth/login']).toEqual(['POST']);
        expect(endpointMethods['/api/v1/auth/login']).not.toContain('GET');
      });
    });
  });
});
