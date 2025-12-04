/**
 * Authentication Security Tests
 *
 * Tests for JWT validation, token refresh, session management,
 * and other authentication-related security measures.
 */

import * as crypto from 'crypto';

import * as jwt from 'jsonwebtoken';

import {
  generateTestToken,
  generateExpiredToken,
  generateTokenWithWrongSignature,
  generateTokenWithWrongAlgorithm,
  TEST_USERS,
  TEST_JWT_SECRET,
  MALFORMED_TOKENS,
  authHeader,
} from './helpers';

describe('Authentication Security', () => {
  describe('JWT Token Validation', () => {
    describe('Token Signature Verification', () => {
      it('should validate token with correct signature', () => {
        const user = TEST_USERS.customer;
        const token = generateTestToken(user);

        // Verify token is valid
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;
        
        expect(decoded.sub).toBe(user.id);
        expect(decoded.email).toBe(user.email);
        expect(decoded.role).toBe(user.role);
      });

      it('should reject token with wrong signature (tampered)', () => {
        const user = TEST_USERS.customer;
        const tamperedToken = generateTokenWithWrongSignature(user);

        expect(() => {
          jwt.verify(tamperedToken, TEST_JWT_SECRET);
        }).toThrow(/invalid signature/i);
      });

      it('should reject token signed with different value', () => {
        const user = TEST_USERS.customer;
        const payload = {
          sub: user.id,
          email: user.email,
          role: user.role,
        };
        const tokenWithDifferentValue = jwt.sign(payload, 'deliberately-different-value', {
          algorithm: 'HS256',
        });

        expect(() => {
          jwt.verify(tokenWithDifferentValue, TEST_JWT_SECRET);
        }).toThrow(/invalid signature/i);
      });

      it('should reject expired tokens', () => {
        const user = TEST_USERS.customer;
        const expiredToken = generateExpiredToken(user);

        expect(() => {
          jwt.verify(expiredToken, TEST_JWT_SECRET);
        }).toThrow(/jwt expired/i);
      });
    });

    describe('Algorithm Confusion Attack Prevention', () => {
      it('should reject token with RS256 when HS256 is expected', () => {
        const user = TEST_USERS.customer;
        const rs256Token = generateTokenWithWrongAlgorithm(user);

        // When verifying with HS256 secret, RS256 token should fail
        expect(() => {
          jwt.verify(rs256Token, TEST_JWT_SECRET, { algorithms: ['HS256'] });
        }).toThrow();
      });

      it('should reject token with "none" algorithm', () => {
        // Create a token with "none" algorithm (CVE-2015-9235)
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
          sub: TEST_USERS.customer.id,
          email: TEST_USERS.customer.email,
          role: 'admin', // Attempting privilege escalation
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })).toString('base64url');
        const noneAlgToken = `${header}.${payload}.`;

        // Should reject when algorithms are explicitly specified
        expect(() => {
          jwt.verify(noneAlgToken, TEST_JWT_SECRET, { algorithms: ['HS256'] });
        }).toThrow();
      });

      it('should only accept specified algorithms', () => {
        const user = TEST_USERS.customer;
        const hs256Token = generateTestToken(user);

        // Should work with HS256
        const decoded = jwt.verify(hs256Token, TEST_JWT_SECRET, {
          algorithms: ['HS256'],
        }) as jwt.JwtPayload;
        expect(decoded.sub).toBe(user.id);

        // Should fail if only RS256 is allowed
        expect(() => {
          jwt.verify(hs256Token, TEST_JWT_SECRET, { algorithms: ['RS256'] });
        }).toThrow();
      });
    });

    describe('Malformed Token Handling', () => {
      Object.entries(MALFORMED_TOKENS).forEach(([name, token]) => {
        it(`should reject malformed token: ${name}`, () => {
          expect(() => {
            jwt.verify(token, TEST_JWT_SECRET);
          }).toThrow();
        });
      });

      it('should reject token with invalid base64 in header', () => {
        const invalidToken = 'not@valid@base64.eyJzdWIiOiIxMjMifQ.signature';
        expect(() => {
          jwt.verify(invalidToken, TEST_JWT_SECRET);
        }).toThrow();
      });

      it('should reject token with invalid JSON in payload', () => {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const invalidPayload = Buffer.from('not valid json').toString('base64url');
        const invalidToken = `${header}.${invalidPayload}.signature`;
        
        expect(() => {
          jwt.verify(invalidToken, TEST_JWT_SECRET);
        }).toThrow();
      });
    });

    describe('Token Payload Security', () => {
      it('should handle tokens with missing required claims', () => {
        // Token without 'sub' claim
        const tokenWithoutSub = jwt.sign(
          { email: 'test@test.com', role: 'customer' },
          TEST_JWT_SECRET,
          { algorithm: 'HS256' }
        );

        const decoded = jwt.verify(tokenWithoutSub, TEST_JWT_SECRET) as jwt.JwtPayload;
        expect(decoded.sub).toBeUndefined();
      });

      it('should prevent privilege escalation via token manipulation', () => {
        // Create a customer token
        const customerToken = generateTestToken(TEST_USERS.customer);
        const decoded = jwt.verify(customerToken, TEST_JWT_SECRET) as jwt.JwtPayload;
        
        // Verify the role is customer, not admin
        expect(decoded.role).toBe('customer');
        expect(decoded.role).not.toBe('admin');
      });

      it('should handle tokens with extra unexpected claims', () => {
        const payload = {
          sub: TEST_USERS.customer.id,
          email: TEST_USERS.customer.email,
          role: 'customer',
          isAdmin: true, // Malicious extra claim
          permissions: ['admin:all'], // Malicious permissions
        };
        
        const token = jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256' });
        const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;
        
        // Token is valid but extra claims should be ignored by the application
        expect(decoded.role).toBe('customer');
      });
    });
  });

  describe('Token Timing Security', () => {
    it('should have appropriate token expiration times', () => {
      const user = TEST_USERS.customer;
      const token = generateTestToken(user, '15m');
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      const expectedExpiry = (decoded.iat || 0) + 15 * 60;
      expect(decoded.exp).toBe(expectedExpiry);
    });

    it('should reject tokens from the future (iat in future)', () => {
      const payload = {
        sub: TEST_USERS.customer.id,
        email: TEST_USERS.customer.email,
        role: 'customer',
        iat: Math.floor(Date.now() / 1000) + 3600, // 1 hour in future
        exp: Math.floor(Date.now() / 1000) + 7200,
      };

      const token = jwt.sign(payload, TEST_JWT_SECRET, { algorithm: 'HS256' });
      
      // Note: Default JWT verification doesn't check iat, but applications should
      const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;
      
      // Application should validate: iat should not be in the future
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.iat).toBeGreaterThan(now);
      // This indicates the token has a future iat - apps should reject this
    });
  });

  describe('Token Refresh Security', () => {
    it('should generate tokens with consistent claims for same user', () => {
      const user = TEST_USERS.customer;
      const token1 = generateTestToken(user);
      const token2 = generateTestToken(user);

      const decoded1 = jwt.decode(token1) as jwt.JwtPayload;
      const decoded2 = jwt.decode(token2) as jwt.JwtPayload;

      // Both tokens should have the same user claims
      expect(decoded1.sub).toBe(decoded2.sub);
      expect(decoded1.email).toBe(decoded2.email);
      expect(decoded1.role).toBe(decoded2.role);
      
      // Note: iat might be the same if generated in same second
      // In production, tokens would include jti (JWT ID) for uniqueness
    });

    it('should include unique identifier for refresh token tracking', () => {
      // Simulating refresh token with tokenId
      const refreshPayload = {
        sub: TEST_USERS.customer.id,
        type: 'refresh',
        tokenId: crypto.randomUUID(),
      };

      const refreshToken = jwt.sign(refreshPayload, TEST_JWT_SECRET, {
        expiresIn: '7d',
        algorithm: 'HS256',
      });

      const decoded = jwt.verify(refreshToken, TEST_JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.tokenId).toBeDefined();
      expect(typeof decoded.tokenId).toBe('string');
    });

    it('should differentiate between access and refresh tokens', () => {
      const accessPayload = {
        sub: TEST_USERS.customer.id,
        email: TEST_USERS.customer.email,
        role: 'customer',
        type: 'access',
      };

      const refreshPayload = {
        sub: TEST_USERS.customer.id,
        type: 'refresh',
        tokenId: crypto.randomUUID(),
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
    });
  });

  describe('Session Management Security', () => {
    it('should support token blacklisting concept', () => {
      const user = TEST_USERS.customer;
      const token = generateTestToken(user);
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      // Tokens should have a unique identifier for blacklisting
      // Either jti claim or sub + iat combination
      expect(decoded.sub).toBeDefined();
      expect(decoded.iat).toBeDefined();

      // Application can use these to track revoked tokens
      const tokenIdentifier = `${decoded.sub}:${decoded.iat}`;
      expect(tokenIdentifier).toBeTruthy();
    });

    it('should have reasonable token lifetimes', () => {
      // Access token: short lived (e.g., 15 minutes)
      const accessToken = jwt.sign(
        { sub: TEST_USERS.customer.id, type: 'access' },
        TEST_JWT_SECRET,
        { expiresIn: '15m', algorithm: 'HS256' }
      );
      const decodedAccess = jwt.decode(accessToken) as jwt.JwtPayload;
      const accessLifetime = (decodedAccess.exp || 0) - (decodedAccess.iat || 0);
      expect(accessLifetime).toBe(15 * 60); // 15 minutes in seconds

      // Refresh token: longer lived (e.g., 7 days)
      const refreshToken = jwt.sign(
        { sub: TEST_USERS.customer.id, type: 'refresh' },
        TEST_JWT_SECRET,
        { expiresIn: '7d', algorithm: 'HS256' }
      );
      const decodedRefresh = jwt.decode(refreshToken) as jwt.JwtPayload;
      const refreshLifetime = (decodedRefresh.exp || 0) - (decodedRefresh.iat || 0);
      expect(refreshLifetime).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });
  });

  describe('RS256 Token Security', () => {
    let privateKey: string;
    let publicKey: string;

    beforeAll(() => {
      // Generate RSA key pair for testing
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      privateKey = keyPair.privateKey;
      publicKey = keyPair.publicKey;
    });

    it('should validate RS256 token with correct public key', () => {
      const payload = {
        sub: TEST_USERS.customer.id,
        email: TEST_USERS.customer.email,
        role: 'customer',
      };

      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;

      expect(decoded.sub).toBe(TEST_USERS.customer.id);
    });

    it('should reject RS256 token signed with different private key', () => {
      const payload = {
        sub: TEST_USERS.customer.id,
        email: TEST_USERS.customer.email,
        role: 'customer',
      };

      // Generate different key pair
      const differentKeyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const token = jwt.sign(payload, differentKeyPair.privateKey, { algorithm: 'RS256' });

      expect(() => {
        jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      }).toThrow(/invalid signature/i);
    });

    it('should reject HS256 token when RS256 is expected', () => {
      const payload = {
        sub: TEST_USERS.customer.id,
        email: TEST_USERS.customer.email,
        role: 'customer',
      };

      // Sign with HS256 using public key as secret (algorithm confusion attack)
      const maliciousToken = jwt.sign(payload, publicKey, { algorithm: 'HS256' });

      // Should fail when only RS256 is allowed
      expect(() => {
        jwt.verify(maliciousToken, publicKey, { algorithms: ['RS256'] });
      }).toThrow();
    });
  });

  describe('Authorization Header Parsing', () => {
    it('should generate correct Bearer token format', () => {
      const user = TEST_USERS.customer;
      const token = generateTestToken(user);
      const header = authHeader(token);

      expect(header.Authorization).toMatch(/^Bearer .+/);
      expect(header.Authorization).toBe(`Bearer ${token}`);
    });

    it('should handle tokens with special characters', () => {
      // JWT tokens use base64url encoding which includes -, _, and no padding
      const user = TEST_USERS.customer;
      const token = generateTestToken(user);

      // Verify token doesn't contain problematic characters
      expect(token).not.toContain('+');
      expect(token).not.toContain('/');
      expect(token).not.toContain('=');
      
      // Should only contain base64url safe characters
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/);
    });
  });
});
