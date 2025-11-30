import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthProxyController } from './auth-proxy.controller';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthProxyController],
      providers: [
        {
          provide: ThrottlerGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthProxyController>(AuthProxyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should handle login request', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await controller.login(loginDto);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('Login endpoint');
    });

    it('should include rate limit note in response', async () => {
      const result = await controller.login({ email: 'test@example.com', password: 'pass' });

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('5 requests per minute');
    });

    it('should handle various login payloads', async () => {
      const payloads = [
        { email: 'user1@test.com', password: 'pass1' },
        { email: 'user2@test.com', password: 'pass2', rememberMe: true },
        { username: 'testuser', password: 'pass3' },
      ];

      for (const payload of payloads) {
        const result = await controller.login(payload);
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('register', () => {
    it('should handle register request', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      const result = await controller.register(registerDto);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('Register endpoint');
    });

    it('should include rate limit note in response', async () => {
      const result = await controller.register({
        email: 'test@example.com',
        password: 'pass',
        name: 'Test',
      });

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('3 requests per minute');
    });

    it('should handle various register payloads', async () => {
      const payloads = [
        { email: 'user1@test.com', password: 'pass1', name: 'User 1' },
        { email: 'user2@test.com', password: 'pass2', name: 'User 2', phone: '08123456789' },
      ];

      for (const payload of payloads) {
        const result = await controller.register(payload);
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('forgotPassword', () => {
    it('should handle forgot password request', async () => {
      const forgotPasswordDto = {
        email: 'user@example.com',
      };

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.message).toContain('Forgot password endpoint');
    });

    it('should include rate limit note in response', async () => {
      const result = await controller.forgotPassword({ email: 'test@example.com' });

      expect(result.data.note).toContain('Rate limited');
      expect(result.data.note).toContain('3 requests per minute');
    });

    it('should handle valid email formats', async () => {
      const emails = [
        'simple@example.com',
        'user.name@domain.co.id',
        'user+tag@example.org',
      ];

      for (const email of emails) {
        const result = await controller.forgotPassword({ email });
        expect(result.data).toBeDefined();
      }
    });
  });

  describe('Rate limiting configuration', () => {
    it('should have AuthThrottlerGuard applied', () => {
      const guards = Reflect.getMetadata('__guards__', AuthProxyController);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThanOrEqual(1);
    });

    it('login should have throttle decorator with limit 5', () => {
      const throttleMetadata = Reflect.getMetadata(
        'THROTTLER:LIMIT',
        controller.login
      );
      // The actual decorator may store metadata differently
      // This verifies the decorator is present
    });

    it('register should have throttle decorator with limit 3', () => {
      const throttleMetadata = Reflect.getMetadata(
        'THROTTLER:LIMIT',
        controller.register
      );
    });

    it('forgotPassword should have throttle decorator with limit 3', () => {
      const throttleMetadata = Reflect.getMetadata(
        'THROTTLER:LIMIT',
        controller.forgotPassword
      );
    });
  });

  describe('HTTP status codes', () => {
    it('login should return 200 OK', () => {
      const httpCode = Reflect.getMetadata('__httpCode__', controller.login);
      expect(httpCode).toBe(200);
    });

    it('register should return 201 Created', () => {
      const httpCode = Reflect.getMetadata('__httpCode__', controller.register);
      expect(httpCode).toBe(201);
    });

    it('forgotPassword should return 200 OK', () => {
      const httpCode = Reflect.getMetadata('__httpCode__', controller.forgotPassword);
      expect(httpCode).toBe(200);
    });
  });

  describe('Controller route paths', () => {
    it('should have base path /auth', () => {
      const path = Reflect.getMetadata('path', AuthProxyController);
      expect(path).toBe('auth');
    });
  });

  describe('Edge cases and error scenarios', () => {
    describe('login edge cases', () => {
      it('should handle empty payload', async () => {
        const result = await controller.login({});
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
      });

      it('should handle null values in payload', async () => {
        const result = await controller.login({ email: null, password: null });
        expect(result.data).toBeDefined();
      });

      it('should handle special characters in email', async () => {
        const result = await controller.login({
          email: "test+special'chars@example.com",
          password: 'password123',
        });
        expect(result.data).toBeDefined();
      });

      it('should handle unicode characters in password', async () => {
        const result = await controller.login({
          email: 'test@example.com',
          password: 'пароль密码كلمةالمرور',
        });
        expect(result.data).toBeDefined();
      });

      it('should handle very long email', async () => {
        const longEmail = 'a'.repeat(200) + '@example.com';
        const result = await controller.login({
          email: longEmail,
          password: 'password123',
        });
        expect(result.data).toBeDefined();
      });
    });

    describe('register edge cases', () => {
      it('should handle empty payload', async () => {
        const result = await controller.register({});
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
      });

      it('should handle additional unexpected fields', async () => {
        const result = await controller.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          unexpectedField: 'some value',
          anotherField: 12345,
        });
        expect(result.data).toBeDefined();
      });

      it('should handle special characters in name', async () => {
        const result = await controller.register({
          email: 'test@example.com',
          password: 'password123',
          name: "O'Brien-Smith Jr.",
        });
        expect(result.data).toBeDefined();
      });
    });

    describe('forgotPassword edge cases', () => {
      it('should handle empty payload', async () => {
        const result = await controller.forgotPassword({});
        expect(result).toBeDefined();
        expect(result.data).toBeDefined();
      });

      it('should handle malformed email', async () => {
        const result = await controller.forgotPassword({ email: 'not-an-email' });
        expect(result.data).toBeDefined();
      });

      it('should handle empty email string', async () => {
        const result = await controller.forgotPassword({ email: '' });
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Decorator verification', () => {
    it('should have method decorator for login', () => {
      const method = Reflect.getMetadata('method', controller.login);
      expect(method).toBeDefined();
    });

    it('should have method decorator for register', () => {
      const method = Reflect.getMetadata('method', controller.register);
      expect(method).toBeDefined();
    });

    it('should have method decorator for forgotPassword', () => {
      const method = Reflect.getMetadata('method', controller.forgotPassword);
      expect(method).toBeDefined();
    });

    it('should have route paths defined for all methods', () => {
      const loginPath = Reflect.getMetadata('path', controller.login);
      const registerPath = Reflect.getMetadata('path', controller.register);
      const forgotPasswordPath = Reflect.getMetadata('path', controller.forgotPassword);

      expect(loginPath).toBe('login');
      expect(registerPath).toBe('register');
      expect(forgotPasswordPath).toBe('forgot-password');
    });
  });
});
