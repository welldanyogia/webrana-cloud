import { UserRole, UserStatus } from '../enums/user.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  iat: number;
  exp: number;
  iss: string;
}

export interface AccessTokenPayload extends JwtPayload {
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
    token_type: 'Bearer';
    expires_in: number;
    user: {
      id: string;
      email: string;
      full_name: string;
      role: UserRole;
      status: UserStatus;
    };
    requires_verification?: boolean;
  };
}

export interface RegisterResponse {
  data: {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    status: UserStatus;
    created_at: string;
  };
}

export interface UserProfileResponse {
  data: {
    id: string;
    email: string;
    full_name: string;
    phone_number: string | null;
    role: UserRole;
    status: UserStatus;
    timezone: string;
    language: string;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  };
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  missingRequirements: string[];
}

export interface PasswordPolicyConfig {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecial: boolean;
}
