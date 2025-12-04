'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type {
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthResponse,
  ApiResponse,
  ApiError,
  User,
} from '@/types';

/**
 * Hook for user login
 */
export function useLogin() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
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
 * Hook for user registration
 */
export function useRegister() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        '/auth/register',
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Registrasi berhasil!');
      router.push('/dashboard');
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.error?.message ||
        'Registrasi gagal. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook for user logout
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

/**
 * Hook to get current user profile
 */
export function useCurrentUser() {
  const { token, setUser, logout, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data.data;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    meta: {
      onSuccess: (data: User) => {
        setUser(data);
        setLoading(false);
      },
      onError: () => {
        logout();
        setLoading(false);
      },
    },
  });
}

/**
 * Hook for forgot password
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        '/auth/forgot-password',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Email reset password telah dikirim!');
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal mengirim email. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook for reset password
 */
export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      const response = await apiClient.post<ApiResponse<{ message: string }>>(
        '/auth/reset-password',
        data
      );
      return response.data.data;
    },
    onSuccess: () => {
      toast.success('Password berhasil direset!');
      router.push('/login');
    },
    onError: (error: AxiosError<ApiError>) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal mereset password. Silakan coba lagi.';
      toast.error(message);
    },
  });
}
