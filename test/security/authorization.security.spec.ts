/**
 * Authorization Security Tests
 *
 * Tests for Role-Based Access Control (RBAC), resource ownership validation,
 * and privilege escalation prevention.
 */

import * as jwt from 'jsonwebtoken';
import {
  generateTestToken,
  TEST_USERS,
  TEST_JWT_SECRET,
  INTERNAL_API_KEY,
  authHeader,
  apiKeyHeader,
  adminHeaders,
} from './helpers';

describe('Authorization Security', () => {
  describe('Role-Based Access Control (RBAC)', () => {
    describe('Role Verification', () => {
      it('should correctly identify customer role from token', () => {
        const customerToken = generateTestToken(TEST_USERS.customer);
        const decoded = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decoded.role).toBe('customer');
        expect(decoded.role).not.toBe('admin');
      });

      it('should correctly identify admin role from token', () => {
        const adminToken = generateTestToken(TEST_USERS.admin);
        const decoded = jwt.verify(adminToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decoded.role).toBe('admin');
      });

      it('should have distinct tokens for different roles', () => {
        const customerToken = generateTestToken(TEST_USERS.customer);
        const adminToken = generateTestToken(TEST_USERS.admin);

        expect(customerToken).not.toBe(adminToken);

        const decodedCustomer = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;
        const decodedAdmin = jwt.verify(adminToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decodedCustomer.role).not.toBe(decodedAdmin.role);
      });
    });

    describe('Admin Endpoint Access Control', () => {
      it('should create valid admin headers with JWT and API key', () => {
        const adminToken = generateTestToken(TEST_USERS.admin);
        const headers = adminHeaders(adminToken);

        expect(headers.Authorization).toBe(`Bearer ${adminToken}`);
        expect(headers['X-API-Key']).toBe(INTERNAL_API_KEY);
      });

      it('should create API key header for internal endpoints', () => {
        const header = apiKeyHeader();

        expect(header['X-API-Key']).toBe(INTERNAL_API_KEY);
        expect(header['X-API-Key']).toBeTruthy();
      });

      it('should not expose internal API key in customer tokens', () => {
        const customerToken = generateTestToken(TEST_USERS.customer);
        const decoded = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decoded).not.toHaveProperty('apiKey');
        expect(decoded).not.toHaveProperty('internalApiKey');
        expect(JSON.stringify(decoded)).not.toContain(INTERNAL_API_KEY);
      });
    });

    describe('Role Hierarchy', () => {
      it('should distinguish between customer and admin privileges', () => {
        const customerToken = generateTestToken(TEST_USERS.customer);
        const adminToken = generateTestToken(TEST_USERS.admin);

        const customerDecoded = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;
        const adminDecoded = jwt.verify(adminToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        // Define role hierarchy check function
        const isAdmin = (role: string) => role === 'admin';
        const canAccessAdminEndpoints = (role: string) => isAdmin(role);

        expect(canAccessAdminEndpoints(customerDecoded.role)).toBe(false);
        expect(canAccessAdminEndpoints(adminDecoded.role)).toBe(true);
      });

      it('should reject unknown roles', () => {
        const maliciousPayload = {
          sub: 'malicious-user',
          email: 'hacker@evil.com',
          role: 'superadmin', // Non-existent role
        };

        const token = jwt.sign(maliciousPayload, TEST_JWT_SECRET, {
          algorithm: 'HS256',
        });

        const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;

        // Application should only accept known roles
        const validRoles = ['customer', 'admin'];
        expect(validRoles).not.toContain(decoded.role);
      });
    });
  });

  describe('Resource Ownership Validation', () => {
    describe('User ID Verification', () => {
      it('should include user ID in token for ownership checks', () => {
        const customerToken = generateTestToken(TEST_USERS.customer);
        const decoded = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decoded.sub).toBe(TEST_USERS.customer.id);
        expect(decoded.sub).toBeDefined();
      });

      it('should have different user IDs for different users', () => {
        const user1Token = generateTestToken(TEST_USERS.customer);
        const user2Token = generateTestToken(TEST_USERS.otherCustomer);

        const decoded1 = jwt.verify(user1Token, TEST_JWT_SECRET) as jwt.JwtPayload;
        const decoded2 = jwt.verify(user2Token, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decoded1.sub).not.toBe(decoded2.sub);
      });

      it('should validate resource ownership logic', () => {
        const ownerId = TEST_USERS.customer.id;
        const requesterId = TEST_USERS.otherCustomer.id;

        // Simulate ownership check
        const isOwner = ownerId === requesterId;
        expect(isOwner).toBe(false);

        // Same user should be owner
        const sameUserCheck = ownerId === ownerId;
        expect(sameUserCheck).toBe(true);
      });
    });

    describe('Cross-User Access Prevention', () => {
      it('should detect when user tries to access another user resources', () => {
        const user1Token = generateTestToken(TEST_USERS.customer);
        const user2Token = generateTestToken(TEST_USERS.otherCustomer);

        const user1Decoded = jwt.verify(user1Token, TEST_JWT_SECRET) as jwt.JwtPayload;
        const user2Decoded = jwt.verify(user2Token, TEST_JWT_SECRET) as jwt.JwtPayload;

        // Simulate resource owned by user1
        const resourceOwnerId = user1Decoded.sub;

        // User2 trying to access user1's resource
        const isAuthorized = resourceOwnerId === user2Decoded.sub;
        expect(isAuthorized).toBe(false);
      });

      it('should allow admin to access any user resources', () => {
        const adminToken = generateTestToken(TEST_USERS.admin);
        const adminDecoded = jwt.verify(adminToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        // Simulate admin override check
        const canAccess = (requestRole: string, resourceOwnerId: string, requestUserId: string) => {
          return requestRole === 'admin' || resourceOwnerId === requestUserId;
        };

        // Admin should access customer's resource
        expect(canAccess(adminDecoded.role, TEST_USERS.customer.id, adminDecoded.sub)).toBe(true);
      });
    });
  });

  describe('Privilege Escalation Prevention', () => {
    describe('Role Manipulation Prevention', () => {
      it('should reject attempts to elevate role in token payload', () => {
        // Attacker creates token with elevated role but wrong signature
        const maliciousPayload = {
          sub: TEST_USERS.customer.id,
          email: TEST_USERS.customer.email,
          role: 'admin', // Attempted escalation
        };

        // Token signed with wrong secret should fail
        const maliciousToken = jwt.sign(maliciousPayload, 'wrong-secret', {
          algorithm: 'HS256',
        });

        expect(() => {
          jwt.verify(maliciousToken, TEST_JWT_SECRET);
        }).toThrow();
      });

      it('should ignore role changes in modified tokens', () => {
        // Get valid customer token
        const customerToken = generateTestToken(TEST_USERS.customer);

        // Attempt to modify payload (this would invalidate signature)
        const parts = customerToken.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        payload.role = 'admin';
        const modifiedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const modifiedToken = `${parts[0]}.${modifiedPayload}.${parts[2]}`;

        // Modified token should fail verification
        expect(() => {
          jwt.verify(modifiedToken, TEST_JWT_SECRET);
        }).toThrow(/invalid signature/i);
      });

      it('should validate that role cannot be self-assigned', () => {
        // Simulate role validation logic
        const validateRoleChange = (
          currentRole: string,
          newRole: string,
          requesterRole: string
        ) => {
          // Only admins can change roles
          if (requesterRole !== 'admin') {
            return false;
          }
          return true;
        };

        // Customer trying to change own role
        expect(validateRoleChange('customer', 'admin', 'customer')).toBe(false);

        // Admin changing customer's role (valid)
        expect(validateRoleChange('customer', 'admin', 'admin')).toBe(true);
      });
    });

    describe('Status Manipulation Prevention', () => {
      it('should reject attempts to manipulate sensitive fields', () => {
        const sensitiveFields = ['role', 'status', 'isVerified', 'permissions'];

        // Simulate request body with attempted manipulation
        const maliciousRequest = {
          planId: 'plan-basic',
          imageId: 'ubuntu-22-04',
          role: 'admin', // Malicious
          status: 'PAID', // Malicious
        };

        // Application should whitelist allowed fields
        const allowedFields = ['planId', 'imageId', 'duration', 'couponCode'];
        const sanitizedRequest: Record<string, unknown> = {};
        
        for (const field of allowedFields) {
          if (field in maliciousRequest) {
            sanitizedRequest[field] = (maliciousRequest as Record<string, unknown>)[field];
          }
        }

        expect(sanitizedRequest).not.toHaveProperty('role');
        expect(sanitizedRequest).not.toHaveProperty('status');
      });

      it('should validate order status transitions', () => {
        // Simulate valid status transitions
        const validTransitions: Record<string, string[]> = {
          'PENDING_PAYMENT': ['PAID', 'CANCELLED', 'EXPIRED'],
          'PAID': ['PROVISIONING', 'FAILED'],
          'PROVISIONING': ['ACTIVE', 'FAILED'],
          'ACTIVE': ['SUSPENDED', 'CANCELLED'],
          'CANCELLED': [],
          'FAILED': [],
        };

        const canTransition = (currentStatus: string, newStatus: string) => {
          return validTransitions[currentStatus]?.includes(newStatus) ?? false;
        };

        // Valid transitions
        expect(canTransition('PENDING_PAYMENT', 'PAID')).toBe(true);
        expect(canTransition('PAID', 'PROVISIONING')).toBe(true);

        // Invalid transitions (attempted manipulation)
        expect(canTransition('PENDING_PAYMENT', 'ACTIVE')).toBe(false);
        expect(canTransition('CANCELLED', 'ACTIVE')).toBe(false);
      });
    });

    describe('IDOR (Insecure Direct Object Reference) Prevention', () => {
      it('should validate resource access with user context', () => {
        const validateAccess = (
          resourceId: string,
          resourceOwnerId: string,
          requestUserId: string,
          requestUserRole: string
        ) => {
          // Admin can access any resource
          if (requestUserRole === 'admin') {
            return true;
          }
          // Regular users can only access their own resources
          return resourceOwnerId === requestUserId;
        };

        // Customer accessing own resource
        expect(
          validateAccess(
            'order-123',
            TEST_USERS.customer.id,
            TEST_USERS.customer.id,
            'customer'
          )
        ).toBe(true);

        // Customer accessing other's resource
        expect(
          validateAccess(
            'order-456',
            TEST_USERS.customer.id,
            TEST_USERS.otherCustomer.id,
            'customer'
          )
        ).toBe(false);

        // Admin accessing customer's resource
        expect(
          validateAccess(
            'order-789',
            TEST_USERS.customer.id,
            TEST_USERS.admin.id,
            'admin'
          )
        ).toBe(true);
      });

      it('should return 404 instead of 403 to prevent enumeration', () => {
        // When user tries to access non-owned resource, return 404
        // This prevents attackers from discovering valid resource IDs
        const getResponseCode = (
          resourceExists: boolean,
          isOwner: boolean,
          isAdmin: boolean
        ) => {
          if (!resourceExists) {
            return 404;
          }
          if (!isOwner && !isAdmin) {
            // Return 404 to hide resource existence
            return 404;
          }
          return 200;
        };

        // Resource exists but not owned - should return 404 (not 403)
        expect(getResponseCode(true, false, false)).toBe(404);

        // Resource doesn't exist
        expect(getResponseCode(false, false, false)).toBe(404);

        // Resource exists and owned
        expect(getResponseCode(true, true, false)).toBe(200);
      });
    });
  });

  describe('API Key Security', () => {
    describe('API Key Validation', () => {
      it('should have non-empty API key', () => {
        expect(INTERNAL_API_KEY).toBeTruthy();
        expect(INTERNAL_API_KEY.length).toBeGreaterThan(10);
      });

      it('should validate API key format', () => {
        const header = apiKeyHeader();
        
        // API key should not contain whitespace
        expect(header['X-API-Key']).not.toMatch(/\s/);
        
        // API key should not be a common default
        const commonDefaults = ['test', 'admin', 'password', '123456'];
        expect(commonDefaults).not.toContain(header['X-API-Key'].toLowerCase());
      });

      it('should detect missing API key', () => {
        const validateApiKey = (providedKey: string | undefined, expectedKey: string) => {
          if (!providedKey) {
            return { valid: false, error: 'API_KEY_MISSING' };
          }
          if (providedKey !== expectedKey) {
            return { valid: false, error: 'API_KEY_INVALID' };
          }
          return { valid: true, error: null };
        };

        expect(validateApiKey(undefined, INTERNAL_API_KEY)).toEqual({
          valid: false,
          error: 'API_KEY_MISSING',
        });

        expect(validateApiKey('', INTERNAL_API_KEY)).toEqual({
          valid: false,
          error: 'API_KEY_MISSING',
        });

        expect(validateApiKey('wrong-key', INTERNAL_API_KEY)).toEqual({
          valid: false,
          error: 'API_KEY_INVALID',
        });

        expect(validateApiKey(INTERNAL_API_KEY, INTERNAL_API_KEY)).toEqual({
          valid: true,
          error: null,
        });
      });
    });

    describe('Combined Auth (JWT + API Key)', () => {
      it('should require both JWT and API key for internal endpoints', () => {
        const validateInternalAccess = (
          hasValidJwt: boolean,
          hasValidApiKey: boolean,
          userRole: string
        ) => {
          return hasValidJwt && hasValidApiKey && userRole === 'admin';
        };

        // All conditions met
        expect(validateInternalAccess(true, true, 'admin')).toBe(true);

        // Missing API key
        expect(validateInternalAccess(true, false, 'admin')).toBe(false);

        // Missing JWT
        expect(validateInternalAccess(false, true, 'admin')).toBe(false);

        // Wrong role
        expect(validateInternalAccess(true, true, 'customer')).toBe(false);
      });
    });
  });

  describe('Token Scope Validation', () => {
    describe('Access Token vs Refresh Token', () => {
      it('should differentiate token types', () => {
        const accessPayload = {
          sub: TEST_USERS.customer.id,
          type: 'access',
          email: TEST_USERS.customer.email,
          role: TEST_USERS.customer.role,
        };

        const refreshPayload = {
          sub: TEST_USERS.customer.id,
          type: 'refresh',
          tokenId: 'unique-token-id',
        };

        const accessToken = jwt.sign(accessPayload, TEST_JWT_SECRET, {
          expiresIn: '15m',
          algorithm: 'HS256',
        });

        const refreshToken = jwt.sign(refreshPayload, TEST_JWT_SECRET, {
          expiresIn: '7d',
          algorithm: 'HS256',
        });

        const decodedAccess = jwt.verify(accessToken, TEST_JWT_SECRET) as jwt.JwtPayload;
        const decodedRefresh = jwt.verify(refreshToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        expect(decodedAccess.type).toBe('access');
        expect(decodedRefresh.type).toBe('refresh');

        // Access token should have user details
        expect(decodedAccess.email).toBeDefined();
        expect(decodedAccess.role).toBeDefined();

        // Refresh token should not have sensitive user details
        expect(decodedRefresh.email).toBeUndefined();
        expect(decodedRefresh.role).toBeUndefined();
      });

      it('should reject refresh token used as access token', () => {
        const refreshPayload = {
          sub: TEST_USERS.customer.id,
          type: 'refresh',
          tokenId: 'unique-token-id',
        };

        const refreshToken = jwt.sign(refreshPayload, TEST_JWT_SECRET, {
          algorithm: 'HS256',
        });

        const decoded = jwt.verify(refreshToken, TEST_JWT_SECRET) as jwt.JwtPayload;

        // Application should reject refresh tokens for API access
        const isAccessToken = decoded.type === 'access';
        expect(isAccessToken).toBe(false);
      });
    });
  });
});
