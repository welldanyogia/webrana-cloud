import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@webrana-cloud/common';

import { JwtTokenService, TokenUser } from './jwt.service';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let nestJwtService: NestJwtService;

  const TEST_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';

  const createMockConfigService = (overrides: Record<string, any> = {}) => {
    const defaults: Record<string, any> = {
      AUTH_JWT_ACCESS_EXPIRY: '15m',
      AUTH_JWT_REFRESH_EXPIRY: '7d',
      AUTH_JWT_ISSUER: 'webrana-cloud-test',
      ...overrides,
    };
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return defaults[key] !== undefined ? defaults[key] : defaultValue;
      }),
    };
  };

  const testUser: TokenUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'customer' as UserRole,
    status: 'active' as UserStatus,
  };

  beforeEach(() => {
    // Create NestJwtService without issuer in signOptions to avoid conflict
    nestJwtService = new NestJwtService({
      secret: TEST_SECRET,
    });
    const mockConfigService = createMockConfigService();
    service = new JwtTokenService(
      nestJwtService,
      mockConfigService as unknown as ConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAccessToken()', () => {
    it('should generate a valid JWT token', () => {
      const token = service.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload fields', () => {
      const token = service.generateAccessToken(testUser);
      const decoded = nestJwtService.decode(token) as any;

      expect(decoded.sub).toBe(testUser.id);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.role).toBe(testUser.role);
      expect(decoded.status).toBe(testUser.status);
      expect(decoded.type).toBe('access');
      // iss is set by NestJwtService module, not by payload
    });

    it('should include iat and exp claims', () => {
      const token = service.generateAccessToken(testUser);
      const decoded = nestJwtService.decode(token) as any;

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should set correct expiry time (15 minutes)', () => {
      const token = service.generateAccessToken(testUser);
      const decoded = nestJwtService.decode(token) as any;

      const expectedExpiry = decoded.iat + 15 * 60; // 15 minutes in seconds
      expect(decoded.exp).toBe(expectedExpiry);
    });
  });

  describe('generateRefreshToken()', () => {
    it('should generate a valid JWT token with tokenId', () => {
      const result = service.generateRefreshToken(testUser.id);

      expect(result.token).toBeDefined();
      expect(result.tokenId).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);
    });

    it('should include correct payload fields', () => {
      const result = service.generateRefreshToken(testUser.id);
      const decoded = nestJwtService.decode(result.token) as any;

      expect(decoded.sub).toBe(testUser.id);
      expect(decoded.tokenId).toBe(result.tokenId);
      expect(decoded.type).toBe('refresh');
    });

    it('should generate unique tokenId for each call', () => {
      const result1 = service.generateRefreshToken(testUser.id);
      const result2 = service.generateRefreshToken(testUser.id);

      expect(result1.tokenId).not.toBe(result2.tokenId);
    });

    it('should set correct expiry time (7 days)', () => {
      const result = service.generateRefreshToken(testUser.id);
      const decoded = nestJwtService.decode(result.token) as any;

      const expectedExpiry = decoded.iat + 7 * 24 * 60 * 60; // 7 days in seconds
      expect(decoded.exp).toBe(expectedExpiry);
    });
  });

  describe('generateTokenPair()', () => {
    it('should return both access and refresh tokens', () => {
      const result = service.generateTokenPair(testUser);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshTokenId).toBeDefined();
      expect(result.expiresIn).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
    });

    it('should return correct expiresIn value (900 seconds for 15m)', () => {
      const result = service.generateTokenPair(testUser);

      expect(result.expiresIn).toBe(900); // 15 minutes = 900 seconds
    });

    it('should generate valid access token in pair', () => {
      const result = service.generateTokenPair(testUser);
      const decoded = nestJwtService.decode(result.accessToken) as any;

      expect(decoded.type).toBe('access');
      expect(decoded.sub).toBe(testUser.id);
    });

    it('should generate valid refresh token in pair', () => {
      const result = service.generateTokenPair(testUser);
      const decoded = nestJwtService.decode(result.refreshToken) as any;

      expect(decoded.type).toBe('refresh');
      expect(decoded.tokenId).toBe(result.refreshTokenId);
    });
  });

  describe('verifyAccessToken()', () => {
    it('should return payload for valid access token', () => {
      const token = service.generateAccessToken(testUser);
      const payload = service.verifyAccessToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe(testUser.id);
      expect(payload?.type).toBe('access');
    });

    it('should return null for expired token', () => {
      // Create a service with very short expiry
      const shortExpiryConfig = createMockConfigService({
        AUTH_JWT_ACCESS_EXPIRY: '1ms',
      });
      const shortExpiryService = new JwtTokenService(
        nestJwtService,
        shortExpiryConfig as unknown as ConfigService
      );

      const token = shortExpiryService.generateAccessToken(testUser);

      // Wait for token to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const payload = shortExpiryService.verifyAccessToken(token);
          expect(payload).toBeNull();
          resolve();
        }, 50);
      });
    });

    it('should return null for invalid signature', () => {
      const token = service.generateAccessToken(testUser);
      const tamperedToken = token.slice(0, -5) + 'xxxxx'; // Tamper with signature

      const payload = service.verifyAccessToken(tamperedToken);

      expect(payload).toBeNull();
    });

    it('should return null for refresh token (wrong type)', () => {
      const { token } = service.generateRefreshToken(testUser.id);
      const payload = service.verifyAccessToken(token);

      expect(payload).toBeNull();
    });

    it('should return null for malformed token', () => {
      const payload = service.verifyAccessToken('not-a-valid-jwt');

      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const payload = service.verifyAccessToken('');

      expect(payload).toBeNull();
    });
  });

  describe('verifyRefreshToken()', () => {
    it('should return payload for valid refresh token', () => {
      const { token, tokenId } = service.generateRefreshToken(testUser.id);
      const payload = service.verifyRefreshToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe(testUser.id);
      expect(payload?.tokenId).toBe(tokenId);
      expect(payload?.type).toBe('refresh');
    });

    it('should return null for expired token', () => {
      const shortExpiryConfig = createMockConfigService({
        AUTH_JWT_REFRESH_EXPIRY: '1ms',
      });
      const shortExpiryService = new JwtTokenService(
        nestJwtService,
        shortExpiryConfig as unknown as ConfigService
      );

      const { token } = shortExpiryService.generateRefreshToken(testUser.id);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const payload = shortExpiryService.verifyRefreshToken(token);
          expect(payload).toBeNull();
          resolve();
        }, 50);
      });
    });

    it('should return null for access token (wrong type)', () => {
      const token = service.generateAccessToken(testUser);
      const payload = service.verifyRefreshToken(token);

      expect(payload).toBeNull();
    });

    it('should return null for invalid signature', () => {
      const { token } = service.generateRefreshToken(testUser.id);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';

      const payload = service.verifyRefreshToken(tamperedToken);

      expect(payload).toBeNull();
    });
  });

  describe('decodeToken()', () => {
    it('should decode valid token without verification', () => {
      const token = service.generateAccessToken(testUser);
      const decoded = service.decodeToken<any>(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(testUser.id);
    });

    it('should return null for malformed token', () => {
      const decoded = service.decodeToken<any>('not-a-jwt');

      expect(decoded).toBeNull();
    });

    it('should return null for empty string', () => {
      const decoded = service.decodeToken<any>('');

      expect(decoded).toBeNull();
    });
  });

  describe('getRefreshExpiryMs()', () => {
    it('should return correct expiry in milliseconds for 7d', () => {
      const expiryMs = service.getRefreshExpiryMs();

      expect(expiryMs).toBe(7 * 24 * 60 * 60 * 1000); // 7 days in ms
    });

    it('should handle different expiry formats', () => {
      const testCases = [
        { expiry: '30s', expected: 30 * 1000 },
        { expiry: '5m', expected: 5 * 60 * 1000 },
        { expiry: '2h', expected: 2 * 60 * 60 * 1000 },
        { expiry: '1d', expected: 24 * 60 * 60 * 1000 },
      ];

      for (const { expiry, expected } of testCases) {
        const configService = createMockConfigService({
          AUTH_JWT_REFRESH_EXPIRY: expiry,
        });
        const testService = new JwtTokenService(
          nestJwtService,
          configService as unknown as ConfigService
        );

        expect(testService.getRefreshExpiryMs()).toBe(expected);
      }
    });

    it('should return default for invalid expiry format', () => {
      const configService = createMockConfigService({
        AUTH_JWT_REFRESH_EXPIRY: 'invalid',
      });
      const testService = new JwtTokenService(
        nestJwtService,
        configService as unknown as ConfigService
      );

      // Default is 900 seconds (15 minutes) * 1000 = 900000 ms
      expect(testService.getRefreshExpiryMs()).toBe(900 * 1000);
    });
  });

  describe('with different user roles and statuses', () => {
    it('should correctly encode admin role', () => {
      const adminUser: TokenUser = {
        ...testUser,
        role: 'admin' as UserRole,
      };

      const token = service.generateAccessToken(adminUser);
      const decoded = nestJwtService.decode(token) as any;

      expect(decoded.role).toBe('admin');
    });

    it('should correctly encode suspended status', () => {
      const suspendedUser: TokenUser = {
        ...testUser,
        status: 'suspended' as UserStatus,
      };

      const token = service.generateAccessToken(suspendedUser);
      const decoded = nestJwtService.decode(token) as any;

      expect(decoded.status).toBe('suspended');
    });

    it('should correctly encode pending_verification status', () => {
      const pendingUser: TokenUser = {
        ...testUser,
        status: 'pending_verification' as UserStatus,
      };

      const token = service.generateAccessToken(pendingUser);
      const decoded = nestJwtService.decode(token) as any;

      expect(decoded.status).toBe('pending_verification');
    });
  });
});
