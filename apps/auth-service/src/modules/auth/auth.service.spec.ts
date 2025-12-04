import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus, VerificationTokenType } from '@prisma/client';

import {
  InvalidCredentialsException,
  AccountSuspendedException,
  AccountDeletedException,
  InvalidTokenException,
  TokenExpiredException,
  TokenUsedException,
  InvalidCurrentPasswordException,
  UserNotFoundException,
  TokenReuseDetectedException,
} from '../../common/exceptions/auth.exceptions';
import { JwtTokenService } from '../../common/services/jwt.service';
import { PasswordService } from '../../common/services/password.service';
import { TokenService } from '../../common/services/token.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../user/user.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let userService: any;
  let jwtTokenService: any;
  let tokenService: any;
  let passwordService: any;
  let configService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    passwordHash: '$2a$12$hashedpassword',
    fullName: 'Test User',
    phoneNumber: null,
    role: UserRole.customer,
    status: UserStatus.active,
    timezone: 'UTC',
    language: 'en',
    lastLoginAt: null,
    lastPasswordChangeAt: null,
    legacyId: null,
    legacySource: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    refreshTokenId: 'mock-token-id',
    expiresIn: 900,
    tokenType: 'Bearer',
  };

  const mockVerificationToken = {
    token: 'mock-verification-token',
    tokenHash: 'mock-token-hash',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    prisma = {
      verificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callbacks) => Promise.all(callbacks)),
    };

    userService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      verifyPassword: jest.fn(),
      updateLastLogin: jest.fn(),
      updatePassword: jest.fn(),
    };

    jwtTokenService = {
      generateTokenPair: jest.fn(),
      verifyRefreshToken: jest.fn(),
      getRefreshExpiryMs: jest.fn().mockReturnValue(7 * 24 * 60 * 60 * 1000),
    };

    tokenService = {
      generateVerificationToken: jest.fn(),
      hashToken: jest.fn(),
      hashRefreshToken: jest.fn(),
    };

    passwordService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    service = new AuthService(
      prisma as PrismaService,
      userService as UserService,
      jwtTokenService as JwtTokenService,
      tokenService as TokenService,
      passwordService as PasswordService,
      configService as ConfigService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('should register user successfully', async () => {
      const dto = {
        email: 'new@example.com',
        password: 'ValidPassword123!',
        full_name: 'New User',
      };

      userService.create.mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
        fullName: 'New User',
        status: UserStatus.pending_verification,
      });
      tokenService.generateVerificationToken.mockReturnValue(mockVerificationToken);
      prisma.verificationToken.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.data.email).toBe('new@example.com');
      expect(result.data.verification_token).toBe(mockVerificationToken.token);
      expect(userService.create).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        fullName: dto.full_name,
        phoneNumber: undefined,
        timezone: undefined,
        language: undefined,
      });
      expect(prisma.verificationToken.create).toHaveBeenCalled();
    });
  });

  describe('login()', () => {
    const loginDto = { email: 'test@example.com', password: 'ValidPassword123!' };

    it('should login active user successfully', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      jwtTokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      tokenService.hashRefreshToken.mockReturnValue('hashed-refresh-token');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.data.access_token).toBe(mockTokenPair.accessToken);
      expect(result.data.refresh_token).toBe(mockTokenPair.refreshToken);
      expect(result.data.user.email).toBe(mockUser.email);
      expect(result.data.requires_verification).toBe(false);
      expect(userService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should login pending_verification user with flag', async () => {
      const pendingUser = { ...mockUser, status: UserStatus.pending_verification };
      userService.findByEmail.mockResolvedValue(pendingUser);
      userService.verifyPassword.mockResolvedValue(true);
      jwtTokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      tokenService.hashRefreshToken.mockReturnValue('hashed-refresh-token');
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result.data.requires_verification).toBe(true);
    });

    it('should throw InvalidCredentialsException for non-existent user', async () => {
      userService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw InvalidCredentialsException for wrong password', async () => {
      userService.findByEmail.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw AccountSuspendedException for suspended user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.suspended };
      userService.findByEmail.mockResolvedValue(suspendedUser);
      userService.verifyPassword.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(AccountSuspendedException);
    });

    it('should throw AccountDeletedException for deleted user', async () => {
      const deletedUser = { ...mockUser, status: UserStatus.deleted };
      userService.findByEmail.mockResolvedValue(deletedUser);
      userService.verifyPassword.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(AccountDeletedException);
    });
  });

  describe('verifyEmail()', () => {
    it('should verify email successfully', async () => {
      const dto = { token: 'valid-token' };
      const mockToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.email_verification,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(mockToken);
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.verifyEmail(dto);

      expect(result.data.message).toBe('Email berhasil diverifikasi');
      expect(result.data.user_id).toBe(mockUser.id);
    });

    it('should throw InvalidTokenException for non-existent token', async () => {
      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalid' })).rejects.toThrow(
        InvalidTokenException
      );
    });

    it('should throw TokenUsedException for already used token', async () => {
      const usedToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.email_verification,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(),
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(usedToken);

      await expect(service.verifyEmail({ token: 'used' })).rejects.toThrow(
        TokenUsedException
      );
    });

    it('should throw TokenExpiredException for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.email_verification,
        expiresAt: new Date(Date.now() - 60000),
        usedAt: null,
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.verifyEmail({ token: 'expired' })).rejects.toThrow(
        TokenExpiredException
      );
    });

    it('should throw InvalidTokenException for wrong token type', async () => {
      const wrongTypeToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.password_reset,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(wrongTypeToken);

      await expect(service.verifyEmail({ token: 'wrong-type' })).rejects.toThrow(
        InvalidTokenException
      );
    });
  });

  describe('refresh()', () => {
    it('should refresh tokens successfully with token rotation', async () => {
      const dto = { refresh_token: 'valid-refresh-token' };
      const storedToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        familyId: 'family-id-123',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        deviceInfo: 'Chrome/Windows',
        ipAddress: '192.168.1.1',
        user: mockUser,
      };

      jwtTokenService.verifyRefreshToken.mockReturnValue({
        sub: mockUser.id,
        tokenId: 'token-id',
        type: 'refresh',
      });
      tokenService.hashRefreshToken.mockReturnValue('hashed-token');
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      prisma.refreshToken.update.mockResolvedValue({});
      jwtTokenService.generateTokenPair.mockReturnValue(mockTokenPair);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(dto);

      expect(result.data.access_token).toBe(mockTokenPair.accessToken);
      expect(result.data.refresh_token).toBe(mockTokenPair.refreshToken);
      // Verify old token is revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: storedToken.id },
        data: { revokedAt: expect.any(Date) },
      });
      // Verify new token is created with same familyId
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: storedToken.familyId,
          userId: mockUser.id,
        }),
      });
    });

    it('should throw InvalidTokenException for invalid JWT', async () => {
      jwtTokenService.verifyRefreshToken.mockReturnValue(null);

      await expect(
        service.refresh({ refresh_token: 'invalid-jwt' })
      ).rejects.toThrow(InvalidTokenException);
    });

    it('should detect token reuse and revoke entire family', async () => {
      const revokedToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        familyId: 'family-id-123',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: new Date(), // Token already revoked
        user: mockUser,
      };

      jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id });
      tokenService.hashRefreshToken.mockReturnValue('hashed-token');
      prisma.refreshToken.findUnique.mockResolvedValue(revokedToken);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      await expect(
        service.refresh({ refresh_token: 'revoked' })
      ).rejects.toThrow(TokenReuseDetectedException);

      // Verify entire family is revoked for security
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          familyId: revokedToken.familyId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw AccountSuspendedException for suspended user', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.suspended };
      const storedToken = {
        id: 'token-id',
        userId: suspendedUser.id,
        tokenHash: 'hashed-token',
        familyId: 'family-id-123',
        expiresAt: new Date(Date.now() + 60000),
        revokedAt: null,
        user: suspendedUser,
      };

      jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: suspendedUser.id });
      tokenService.hashRefreshToken.mockReturnValue('hashed-token');
      prisma.refreshToken.findUnique.mockResolvedValue(storedToken);

      await expect(service.refresh({ refresh_token: 'valid' })).rejects.toThrow(
        AccountSuspendedException
      );
    });

    it('should throw TokenExpiredException for expired token', async () => {
      const expiredToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        familyId: 'family-id-123',
        expiresAt: new Date(Date.now() - 60000), // Expired
        revokedAt: null,
        user: mockUser,
      };

      jwtTokenService.verifyRefreshToken.mockReturnValue({ sub: mockUser.id });
      tokenService.hashRefreshToken.mockReturnValue('hashed-token');
      prisma.refreshToken.findUnique.mockResolvedValue(expiredToken);

      await expect(service.refresh({ refresh_token: 'expired' })).rejects.toThrow(
        TokenExpiredException
      );
    });
  });

  describe('resetPassword()', () => {
    it('should reset password successfully', async () => {
      const dto = { token: 'valid-token', new_password: 'NewPassword123!' };
      const mockToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.password_reset,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(mockToken);
      userService.updatePassword.mockResolvedValue(undefined);
      prisma.verificationToken.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.resetPassword(dto);

      expect(result.data.message).toBe('Password berhasil direset');
      expect(userService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        dto.new_password
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled(); // Revoke all refresh tokens
    });

    it('should throw TokenUsedException for already used token', async () => {
      const usedToken = {
        id: 'token-id',
        userId: mockUser.id,
        tokenHash: 'hashed-token',
        type: VerificationTokenType.password_reset,
        expiresAt: new Date(Date.now() + 60000),
        usedAt: new Date(),
        user: mockUser,
      };

      tokenService.hashToken.mockReturnValue('hashed-token');
      prisma.verificationToken.findUnique.mockResolvedValue(usedToken);

      await expect(
        service.resetPassword({ token: 'used', new_password: 'NewPass123!' })
      ).rejects.toThrow(TokenUsedException);
    });
  });

  describe('changePassword()', () => {
    it('should change password successfully', async () => {
      const dto = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      };

      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(true);
      userService.updatePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(mockUser.id, dto);

      expect(result.data.message).toBe('Password berhasil diubah');
      expect(userService.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        dto.new_password
      );
    });

    it('should throw InvalidCurrentPasswordException for wrong current password', async () => {
      const dto = {
        current_password: 'WrongPassword123!',
        new_password: 'NewPassword123!',
      };

      userService.findByIdOrThrow.mockResolvedValue(mockUser);
      userService.verifyPassword.mockResolvedValue(false);

      await expect(service.changePassword(mockUser.id, dto)).rejects.toThrow(
        InvalidCurrentPasswordException
      );
    });

    it('should throw UserNotFoundException when user not found', async () => {
      const dto = {
        current_password: 'OldPassword123!',
        new_password: 'NewPassword123!',
      };

      userService.findByIdOrThrow.mockRejectedValue(new UserNotFoundException());

      await expect(service.changePassword('nonexistent', dto)).rejects.toThrow(
        UserNotFoundException
      );
    });
  });

  describe('logout()', () => {
    it('should logout successfully', async () => {
      const dto = { refresh_token: 'valid-token' };

      tokenService.hashRefreshToken.mockReturnValue('hashed-token');
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout(dto);

      expect(result.data.message).toBe('Logout berhasil');
    });
  });

  describe('logoutAll()', () => {
    it('should logout all sessions successfully', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.logoutAll(mockUser.id);

      expect(result.data.message).toBe('Semua sesi berhasil di-logout');
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('getProfile()', () => {
    it('should return user profile', async () => {
      userService.findByIdOrThrow.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id);

      expect(result.data.id).toBe(mockUser.id);
      expect(result.data.email).toBe(mockUser.email);
      expect(result.data.full_name).toBe(mockUser.fullName);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      userService.findByIdOrThrow.mockRejectedValue(new UserNotFoundException());

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        UserNotFoundException
      );
    });
  });
});
