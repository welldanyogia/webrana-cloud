import { randomBytes, createHash } from 'crypto';

import { PrismaClient, UserRole, UserStatus, VerificationTokenType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const BCRYPT_ROUNDS = 10; // Lower for tests (faster)

export interface CreateTestUserOptions {
  email?: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string;
  role?: UserRole;
  status?: UserStatus;
  timezone?: string;
  language?: string;
}

export interface TestUser {
  id: string;
  email: string;
  password: string; // Plain text password for testing
  passwordHash: string;
  fullName: string;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
  timezone: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createTestUser(
  prisma: PrismaClient,
  options: CreateTestUserOptions = {}
): Promise<TestUser> {
  const password = options.password || 'TestPassword123!';
  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  const email = options.email || `test-${uuidv4().substring(0, 8)}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: options.fullName || 'Test User',
      phoneNumber: options.phoneNumber || null,
      role: options.role || UserRole.customer,
      status: options.status || UserStatus.active,
      timezone: options.timezone || 'UTC',
      language: options.language || 'en',
    },
  });

  return {
    ...user,
    password, // Include plain text password for test assertions
  };
}

export interface CreateVerificationTokenOptions {
  userId: string;
  type?: VerificationTokenType;
  expiresInMs?: number;
  used?: boolean;
}

export interface TestVerificationToken {
  id: string;
  userId: string;
  token: string; // Plain text token for testing
  tokenHash: string;
  type: VerificationTokenType;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export async function createVerificationToken(
  prisma: PrismaClient,
  options: CreateVerificationTokenOptions
): Promise<TestVerificationToken> {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const expiresInMs = options.expiresInMs ?? 24 * 60 * 60 * 1000; // Default 24h
  const expiresAt = new Date(Date.now() + expiresInMs);

  const verificationToken = await prisma.verificationToken.create({
    data: {
      userId: options.userId,
      tokenHash,
      type: options.type || VerificationTokenType.email_verification,
      expiresAt,
      usedAt: options.used ? new Date() : null,
    },
  });

  return {
    ...verificationToken,
    token, // Include plain text token for test assertions
  };
}

export interface CreateRefreshTokenOptions {
  userId: string;
  expiresInMs?: number;
  revoked?: boolean;
  deviceInfo?: string;
  ipAddress?: string;
}

export interface TestRefreshToken {
  id: string;
  userId: string;
  token: string; // Plain text token (JWT) for testing
  tokenHash: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export async function createRefreshToken(
  prisma: PrismaClient,
  options: CreateRefreshTokenOptions
): Promise<TestRefreshToken> {
  // Generate a mock JWT-like token for testing
  const tokenId = uuidv4();
  const token = `mock-refresh-token-${tokenId}`;
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const expiresInMs = options.expiresInMs ?? 7 * 24 * 60 * 60 * 1000; // Default 7d
  const expiresAt = new Date(Date.now() + expiresInMs);

  const refreshToken = await prisma.refreshToken.create({
    data: {
      userId: options.userId,
      tokenHash,
      deviceInfo: options.deviceInfo || null,
      ipAddress: options.ipAddress || null,
      expiresAt,
      revokedAt: options.revoked ? new Date() : null,
    },
  });

  return {
    ...refreshToken,
    token, // Include plain text token for test assertions
  };
}

export async function createExpiredVerificationToken(
  prisma: PrismaClient,
  userId: string,
  type: VerificationTokenType = VerificationTokenType.email_verification
): Promise<TestVerificationToken> {
  return createVerificationToken(prisma, {
    userId,
    type,
    expiresInMs: -1000, // Expired 1 second ago
  });
}

export async function createExpiredRefreshToken(
  prisma: PrismaClient,
  userId: string
): Promise<TestRefreshToken> {
  return createRefreshToken(prisma, {
    userId,
    expiresInMs: -1000, // Expired 1 second ago
  });
}

export function generateTestEmail(): string {
  return `test-${uuidv4().substring(0, 8)}@example.com`;
}

export function generateStrongPassword(): string {
  return `Test${randomBytes(4).toString('hex')}!`;
}
