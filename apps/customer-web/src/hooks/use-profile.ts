'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import {
  profileService,
  UpdateProfileDto,
  ChangePasswordDto,
} from '@/services/profile.service';
import { useAuthStore } from '@/stores/auth-store';
import type { User, ApiError } from '@/types';

/**
 * Hook to fetch current user profile
 */
export function useProfile() {
  const { token } = useAuthStore();

  return useQuery<User>({
    queryKey: ['profile'],
    queryFn: () => profileService.getProfile(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation<User, AxiosError<ApiError>, UpdateProfileDto>({
    mutationFn: (data) => profileService.updateProfile(data),
    onSuccess: (user) => {
      // Update auth store with new user data
      setUser(user);
      // Invalidate profile and currentUser queries
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Profil berhasil diperbarui!');
    },
    onError: (error) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal memperbarui profil. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook to change user password
 */
export function useChangePassword() {
  return useMutation<void, AxiosError<ApiError>, ChangePasswordDto>({
    mutationFn: (data) => profileService.changePassword(data),
    onSuccess: () => {
      toast.success('Password berhasil diubah!');
    },
    onError: (error) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal mengubah password. Silakan coba lagi.';
      toast.error(message);
    },
  });
}
