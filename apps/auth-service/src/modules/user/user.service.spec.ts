import { UserRole, UserStatus } from '@prisma/client';

import {
  EmailExistsException,
  UserNotFoundException,
  PasswordValidationException,
} from '../../common/exceptions/auth.exceptions';
import { PasswordService } from '../../common/services/password.service';
import { PrismaService } from '../../prisma/prisma.service';

import { UserService, CreateUserData, UpdateUserData } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let passwordSvc: any;

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

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    passwordSvc = {
      hash: jest.fn(),
      verify: jest.fn(),
      validatePolicy: jest.fn(),
      getPolicy: jest.fn(),
    };

    // Directly instantiate with mocks
    service = new UserService(
      prisma as PrismaService,
      passwordSvc as PasswordService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail()', () => {
    it('should return user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.findByEmail('TEST@EXAMPLE.COM');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findById()', () => {
    it('should return user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrThrow()', () => {
    it('should return user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByIdOrThrow(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw UserNotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findByIdOrThrow('nonexistent-id')).rejects.toThrow(
        UserNotFoundException
      );
    });
  });

  describe('create()', () => {
    const createUserData: CreateUserData = {
      email: 'newuser@example.com',
      password: 'ValidPassword123!',
      fullName: 'New User',
    };

    it('should create user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: true,
        missingRequirements: [],
      });
      passwordSvc.hash.mockResolvedValue('$2a$12$newhash');
      prisma.user.create.mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        fullName: 'New User',
        status: UserStatus.pending_verification,
      });

      const result = await service.create(createUserData);

      expect(result.email).toBe('newuser@example.com');
      expect(result.status).toBe(UserStatus.pending_verification);
      expect(passwordSvc.hash).toHaveBeenCalledWith('ValidPassword123!');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          passwordHash: '$2a$12$newhash',
          fullName: 'New User',
          status: UserStatus.pending_verification,
        }),
      });
    });

    it('should throw EmailExistsException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserData)).rejects.toThrow(
        EmailExistsException
      );
      expect(passwordSvc.validatePolicy).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw PasswordValidationException when password policy fails', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: false,
        missingRequirements: ['minimum 8 characters', 'at least one uppercase'],
      });

      await expect(service.create(createUserData)).rejects.toThrow(
        PasswordValidationException
      );
      expect(passwordSvc.hash).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: true,
        missingRequirements: [],
      });
      passwordSvc.hash.mockResolvedValue('$2a$12$hash');
      prisma.user.create.mockResolvedValue(mockUser);

      await service.create({
        ...createUserData,
        email: 'UPPERCASE@EXAMPLE.COM',
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'uppercase@example.com',
        }),
      });
    });

    it('should use default values for optional fields', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: true,
        missingRequirements: [],
      });
      passwordSvc.hash.mockResolvedValue('$2a$12$hash');
      prisma.user.create.mockResolvedValue(mockUser);

      await service.create(createUserData);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timezone: 'UTC',
          language: 'en',
          role: UserRole.customer,
        }),
      });
    });

    it('should use provided optional values', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: true,
        missingRequirements: [],
      });
      passwordSvc.hash.mockResolvedValue('$2a$12$hash');
      prisma.user.create.mockResolvedValue(mockUser);

      await service.create({
        ...createUserData,
        phoneNumber: '+628123456789',
        timezone: 'Asia/Jakarta',
        language: 'id',
        role: UserRole.admin,
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phoneNumber: '+628123456789',
          timezone: 'Asia/Jakarta',
          language: 'id',
          role: UserRole.admin,
        }),
      });
    });
  });

  describe('updateProfile()', () => {
    const updateData: UpdateUserData = {
      fullName: 'Updated Name',
      phoneNumber: '+628111111111',
      timezone: 'Asia/Jakarta',
      language: 'id',
    };

    it('should update profile successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        ...updateData,
      });

      const result = await service.updateProfile(mockUser.id, updateData);

      expect(result.fullName).toBe('Updated Name');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updateData,
      });
    });

    it('should throw UserNotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent-id', updateData)
      ).rejects.toThrow(UserNotFoundException);
    });

    it('should update partial data', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updateProfile(mockUser.id, { fullName: 'Only Name' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { fullName: 'Only Name' },
      });
    });
  });

  describe('updatePassword()', () => {
    it('should update password successfully', async () => {
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: true,
        missingRequirements: [],
      });
      passwordSvc.hash.mockResolvedValue('$2a$12$newhash');
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updatePassword(mockUser.id, 'NewValidPassword123!');

      expect(passwordSvc.validatePolicy).toHaveBeenCalledWith(
        'NewValidPassword123!'
      );
      expect(passwordSvc.hash).toHaveBeenCalledWith('NewValidPassword123!');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: '$2a$12$newhash',
          lastPasswordChangeAt: expect.any(Date),
        },
      });
    });

    it('should throw PasswordValidationException when policy fails', async () => {
      passwordSvc.validatePolicy.mockReturnValue({
        isValid: false,
        missingRequirements: ['at least one special character'],
      });

      await expect(
        service.updatePassword(mockUser.id, 'weakpassword')
      ).rejects.toThrow(PasswordValidationException);

      expect(passwordSvc.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('activateUser()', () => {
    it('should activate user successfully', async () => {
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        status: UserStatus.active,
      });

      const result = await service.activateUser(mockUser.id);

      expect(result.status).toBe(UserStatus.active);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { status: UserStatus.active },
      });
    });
  });

  describe('updateLastLogin()', () => {
    it('should update last login timestamp', async () => {
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updateLastLogin(mockUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('verifyPassword()', () => {
    it('should return true for correct password', async () => {
      passwordSvc.verify.mockResolvedValue(true);

      const result = await service.verifyPassword(mockUser, 'correctpassword');

      expect(result).toBe(true);
      expect(passwordSvc.verify).toHaveBeenCalledWith(
        'correctpassword',
        mockUser.passwordHash
      );
    });

    it('should return false for incorrect password', async () => {
      passwordSvc.verify.mockResolvedValue(false);

      const result = await service.verifyPassword(mockUser, 'wrongpassword');

      expect(result).toBe(false);
    });

    it('should delegate to PasswordService', async () => {
      passwordSvc.verify.mockResolvedValue(true);

      await service.verifyPassword(mockUser, 'anypassword');

      expect(passwordSvc.verify).toHaveBeenCalledTimes(1);
      expect(passwordSvc.verify).toHaveBeenCalledWith(
        'anypassword',
        mockUser.passwordHash
      );
    });
  });
});
