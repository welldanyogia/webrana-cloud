import { Injectable, Logger } from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';

import {
  EmailExistsException,
  UserNotFoundException,
  PasswordValidationException,
} from '../../common/exceptions/auth.exceptions';
import { PasswordService } from '../../common/services/password.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
  role?: UserRole;
}

export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  timezone?: string;
  language?: string;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new UserNotFoundException();
    }
    return user;
  }

  async create(data: CreateUserData): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new EmailExistsException();
    }

    const passwordValidation = this.passwordService.validatePolicy(data.password);
    if (!passwordValidation.isValid) {
      throw new PasswordValidationException(passwordValidation.missingRequirements);
    }

    const passwordHash = await this.passwordService.hash(data.password);

    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        timezone: data.timezone || 'UTC',
        language: data.language || 'en',
        role: data.role || UserRole.customer,
        status: UserStatus.pending_verification,
      },
    });

    this.logger.log(`User created: ${user.id} (${user.email})`);
    return user;
  }

  async updateProfile(userId: string, data: UpdateUserData): Promise<User> {
    const user = await this.findByIdOrThrow(userId);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        timezone: data.timezone,
        language: data.language,
      },
    });

    this.logger.log(`User profile updated: ${user.id}`);
    return updatedUser;
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordValidation = this.passwordService.validatePolicy(newPassword);
    if (!passwordValidation.isValid) {
      throw new PasswordValidationException(passwordValidation.missingRequirements);
    }

    const passwordHash = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        lastPasswordChangeAt: new Date(),
      },
    });

    this.logger.log(`Password updated for user: ${userId}`);
  }

  async activateUser(userId: string): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.active },
    });

    this.logger.log(`User activated: ${userId}`);
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return this.passwordService.verify(password, user.passwordHash);
  }
}
