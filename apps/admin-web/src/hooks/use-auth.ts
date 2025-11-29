'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type {
  LoginRequest,
  AuthResponse,
  ApiResponse,
  ApiError,
} from '@/types';

/**
 * Hook for admin login
 * Validates that user has admin role before allowing access
 */
export function useLogin() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        '/auth/login',
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Validate admin role
      if (data.user.role !== 'ADMIN' && data.user.role !== 'SUPER_ADMIN') {
        toast.error('Akses ditolak. Hanya admin yang dapat masuk.');
        logout();
        return;
      }
      
      setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Login berhasil!');
      router.push('/dashboard');
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.error?.message || 'Login gagal. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook for admin logout
 */
export function useLogout() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Optional: Call logout endpoint if exists
      try {
        await apiClient.post('/auth/logout');
      } catch {
        // Ignore errors - we'll clear local state anyway
      }
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Logout berhasil!');
      router.push('/login');
    },
    onError: () => {
      // Even on error, clear local state
      logout();
      queryClient.clear();
      router.push('/login');
    },
  });
}
