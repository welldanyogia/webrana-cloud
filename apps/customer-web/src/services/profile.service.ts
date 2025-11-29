import { apiClient } from '@/lib/api-client';
import type { User, ApiResponse } from '@/types';

// Profile API endpoints are in auth-service
const AUTH_API_BASE = '/users';

/**
 * DTO for updating user profile
 */
export interface UpdateProfileDto {
  name: string;
}

/**
 * DTO for changing password
 */
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get current user profile
 */
export async function getProfile(): Promise<User> {
  const response = await apiClient.get<ApiResponse<User>>(`${AUTH_API_BASE}/me`);
  return response.data.data;
}

/**
 * Update user profile (name)
 */
export async function updateProfile(data: UpdateProfileDto): Promise<User> {
  const response = await apiClient.put<ApiResponse<User>>(
    `${AUTH_API_BASE}/me`,
    data
  );
  return response.data.data;
}

/**
 * Change user password
 */
export async function changePassword(data: ChangePasswordDto): Promise<void> {
  await apiClient.post('/auth/change-password', data);
}

export const profileService = {
  getProfile,
  updateProfile,
  changePassword,
};

export default profileService;
