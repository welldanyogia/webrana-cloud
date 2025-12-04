'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

import { vpsService, VpsOrder, VpsListResponse, VpsListParams } from '@/services/vps.service';
import type { ApiError } from '@/types';

// ============================================
// Query Keys
// ============================================

export const vpsKeys = {
  all: ['vps'] as const,
  lists: () => [...vpsKeys.all, 'list'] as const,
  list: (params?: VpsListParams) => [...vpsKeys.lists(), params] as const,
  details: () => [...vpsKeys.all, 'detail'] as const,
  detail: (id: string) => [...vpsKeys.details(), id] as const,
};

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to fetch paginated VPS list
 */
export function useVpsList(params?: VpsListParams) {
  return useQuery<VpsListResponse>({
    queryKey: vpsKeys.list(params),
    queryFn: () => vpsService.list(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refresh every 30s for status updates
    placeholderData: {
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    },
  });
}

/**
 * Hook to fetch single VPS details
 */
export function useVpsDetail(id: string | null) {
  return useQuery<VpsOrder>({
    queryKey: vpsKeys.detail(id!),
    queryFn: () => vpsService.getById(id!),
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds - status can change
    refetchInterval: 10 * 1000, // Refresh every 10s for real-time status
  });
}

// ============================================
// Power Control Mutations
// ============================================

/**
 * Hook to power on VPS
 */
export function useVpsPowerOn() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: (id: string) => vpsService.powerOn(id),
    onSuccess: () => {
      toast.success('VPS sedang dinyalakan...');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal menyalakan VPS';
      toast.error(message);
    },
  });
}

/**
 * Hook to power off VPS
 */
export function useVpsPowerOff() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: (id: string) => vpsService.powerOff(id),
    onSuccess: () => {
      toast.success('VPS sedang dimatikan...');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal mematikan VPS';
      toast.error(message);
    },
  });
}

/**
 * Hook to reboot VPS
 */
export function useVpsReboot() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: (id: string) => vpsService.reboot(id),
    onSuccess: () => {
      toast.success('VPS sedang di-restart...');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal me-restart VPS';
      toast.error(message);
    },
  });
}

// ============================================
// Lifecycle Mutations
// ============================================

/**
 * Hook to toggle auto-renewal
 */
export function useVpsToggleAutoRenew() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, { id: string; enabled: boolean }>({
    mutationFn: ({ id, enabled }) => vpsService.toggleAutoRenew(id, enabled),
    onSuccess: (_, { enabled }) => {
      toast.success(enabled ? 'Auto-renewal diaktifkan' : 'Auto-renewal dinonaktifkan');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal mengubah pengaturan auto-renewal';
      toast.error(message);
    },
  });
}

/**
 * Hook for manual renewal
 */
export function useVpsManualRenew() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: (id: string) => vpsService.manualRenew(id),
    onSuccess: () => {
      toast.success('VPS berhasil diperpanjang!');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal memperpanjang VPS. Pastikan saldo mencukupi.';
      toast.error(message);
    },
  });
}

// ============================================
// Danger Zone Mutations
// ============================================

/**
 * Hook to delete VPS
 */
export function useVpsDelete() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, string>({
    mutationFn: (id: string) => vpsService.delete(id),
    onSuccess: () => {
      toast.success('VPS telah dihapus');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal menghapus VPS';
      toast.error(message);
    },
  });
}

/**
 * Hook to rebuild VPS with new OS
 */
export function useVpsRebuild() {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError<ApiError>, { id: string; imageId: string }>({
    mutationFn: ({ id, imageId }) => vpsService.rebuild(id, imageId),
    onSuccess: () => {
      toast.success('VPS sedang di-rebuild. Proses ini membutuhkan beberapa menit.');
      queryClient.invalidateQueries({ queryKey: vpsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message = error.response?.data?.error?.message || 'Gagal me-rebuild VPS';
      toast.error(message);
    },
  });
}

// ============================================
// Console Hook
// ============================================

/**
 * Hook to get VNC console URL
 */
export function useVpsConsoleUrl(id: string | null) {
  return useQuery<{ url: string }>({
    queryKey: [...vpsKeys.detail(id!), 'console'],
    queryFn: () => vpsService.getConsoleUrl(id!),
    enabled: false, // Only fetch when explicitly called
    staleTime: 0, // Always fetch fresh URL
  });
}
