import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

describe('JwtAuthGuard', () => {
  const createMockExecutionContext = (authHeader?: string): ExecutionContext => {
    const request = {
      headers: authHeader ? { authorization: authHeader } : {},
      user: null as any,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  describe('HS256 Mode (Development)', () => {
    let guard: JwtAuthGuard;
    const secret = 'test-secret';

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          JWT_ALGORITHM: 'HS256',
          JWT_SECRET: secret,
          JWT_PUBLIC_KEY: '',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const generateHS256Token = (payload: object) => {
      return jwt.sign(payload, secret, { algorithm: 'HS256' });
    };

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    it('should validate HS256 token successfully', async () => {
      const token = generateHS256Token({
        sub: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });

      const context = createMockExecutionContext(`Bearer ${token}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
    });

    it('should reject token with wrong secret', async () => {
      const invalidToken = jwt.sign(
        { sub: 'user-123' },
        'wrong-secret',
        { algorithm: 'HS256' }
      );

      const context = createMockExecutionContext(`Bearer ${invalidToken}`);
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: 'user-123' },
        secret,
        { expiresIn: '-1h' }
      );

      const context = createMockExecutionContext(`Bearer ${expiredToken}`);
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('RS256 Mode (Production Default)', () => {
    let guard: JwtAuthGuard;
    let privateKey: string;
    let publicKey: string;

    // Generate RSA key pair for testing
    beforeAll(() => {
      const { publicKey: pubKey, privateKey: privKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      publicKey = pubKey;
      privateKey = privKey;
    });

    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_ALGORITHM: 'RS256',
            JWT_PUBLIC_KEY: publicKey,
            JWT_SECRET: '',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    it('should validate RS256 token successfully', async () => {
      const token = jwt.sign(
        { sub: 'user-456', email: 'admin@example.com', role: 'admin' },
        privateKey,
        { algorithm: 'RS256' }
      );

      const context = createMockExecutionContext(`Bearer ${token}`);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
      });
    });

    it('should reject RS256 token signed with different private key', async () => {
      const { privateKey: otherPrivateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });

      const invalidToken = jwt.sign(
        { sub: 'user-123' },
        otherPrivateKey,
        { algorithm: 'RS256' }
      );

      const context = createMockExecutionContext(`Bearer ${invalidToken}`);
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Common scenarios', () => {
    let guard: JwtAuthGuard;
    const secret = 'test-secret';

    beforeEach(async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_ALGORITHM: 'HS256',
            JWT_SECRET: secret,
            JWT_PUBLIC_KEY: '',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext();
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid Authorization header format', async () => {
      const context = createMockExecutionContext('InvalidFormat token');
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for malformed token', async () => {
      const context = createMockExecutionContext('Bearer malformed.token.here');
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Missing config scenarios', () => {
    it('should throw UnauthorizedException when RS256 mode but no public key', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_ALGORITHM: 'RS256',
            JWT_PUBLIC_KEY: '', // Missing!
            JWT_SECRET: '',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      const token = 'some.jwt.token';
      const context = createMockExecutionContext(`Bearer ${token}`);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when HS256 mode but no secret', async () => {
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          const config: Record<string, unknown> = {
            JWT_ALGORITHM: 'HS256',
            JWT_SECRET: '', // Missing!
            JWT_PUBLIC_KEY: '',
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          JwtAuthGuard,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const guard = module.get<JwtAuthGuard>(JwtAuthGuard);
      const token = 'some.jwt.token';
      const context = createMockExecutionContext(`Bearer ${token}`);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
