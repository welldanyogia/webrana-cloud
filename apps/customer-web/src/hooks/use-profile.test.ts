import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useProfile, useUpdateProfile, useChangePassword } from './use-profile';

import { createWrapper } from '@/test/test-utils';

// Mock the auth store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'test-token',
    setUser: vi.fn(),
  })),
}));

// Mock the profile service
vi.mock('@/services/profile.service', () => ({
  profileService: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

import { profileService } from '@/services/profile.service';
import { useAuthStore } from '@/stores/auth-store';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CUSTOMER' as const,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('use-profile hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      token: 'test-token',
      setUser: vi.fn(),
    });
  });

  describe('useProfile', () => {
    it('should fetch profile when token exists', async () => {
      vi.mocked(profileService.getProfile).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUser);
      expect(profileService.getProfile).toHaveBeenCalledTimes(1);
    });

    it('should not fetch profile when token is missing', async () => {
      vi.mocked(useAuthStore).mockReturnValue({
        token: null,
        setUser: vi.fn(),
      });

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(profileService.getProfile).not.toHaveBeenCalled();
    });

    it('should handle profile fetch error', async () => {
      vi.mocked(profileService.getProfile).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useProfile(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateProfile', () => {
    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      vi.mocked(profileService.updateProfile).mockResolvedValue(updatedUser);

      const setUser = vi.fn();
      vi.mocked(useAuthStore).mockReturnValue({
        token: 'test-token',
        setUser,
      });

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: 'Updated Name' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(profileService.updateProfile).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(setUser).toHaveBeenCalledWith(updatedUser);
    });

    it('should handle update error', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Failed to update profile',
            },
          },
        },
      };
      vi.mocked(profileService.updateProfile).mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ name: 'New Name' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useChangePassword', () => {
    const MOCK_OLD_PW = 'mock-current-pw';
    const MOCK_NEW_PW = 'mock-new-pw';
    const MOCK_WRONG_PW = 'mock-wrong-pw';

    it('should change password successfully', async () => {
      vi.mocked(profileService.changePassword).mockResolvedValue(undefined);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        currentPassword: MOCK_OLD_PW,
        newPassword: MOCK_NEW_PW,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(profileService.changePassword).toHaveBeenCalledWith({
        currentPassword: MOCK_OLD_PW,
        newPassword: MOCK_NEW_PW,
      });
    });

    it('should handle password change error', async () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Current password is incorrect',
            },
          },
        },
      };
      vi.mocked(profileService.changePassword).mockRejectedValue(error);

      const { result } = renderHook(() => useChangePassword(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        currentPassword: MOCK_WRONG_PW,
        newPassword: MOCK_NEW_PW,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
