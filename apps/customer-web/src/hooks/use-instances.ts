'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { instanceService } from '@/services/instance.service';
import type {
  InstanceDetail,
  InstanceAction,
  InstanceActionType,
  InstancePaginatedResult,
  ApiError,
} from '@/types';

/**
 * Action type labels in Indonesian
 */
export const ACTION_LABELS: Record<InstanceActionType, string> = {
  reboot: 'Restart Server',
  power_on: 'Nyalakan Server',
  power_off: 'Matikan Server',
  reset_password: 'Reset Password Root',
};

/**
 * Hook to fetch paginated instances
 */
export function useInstances(params?: { page?: number; limit?: number }) {
  return useQuery<InstancePaginatedResult>({
    queryKey: ['instances', params],
    queryFn: () => instanceService.getInstances(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single instance detail
 */
export function useInstance(instanceId: string | null) {
  return useQuery<InstanceDetail>({
    queryKey: ['instances', instanceId],
    queryFn: () => instanceService.getInstance(instanceId!),
    enabled: !!instanceId,
    staleTime: 10 * 1000, // 10 seconds - status can change
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time status
  });
}

/**
 * Hook to trigger an action on an instance
 */
export function useTriggerAction() {
  const queryClient = useQueryClient();

  return useMutation<
    InstanceAction,
    AxiosError<ApiError>,
    { instanceId: string; type: InstanceActionType }
  >({
    mutationFn: ({ instanceId, type }) =>
      instanceService.triggerAction(instanceId, type),
    onSuccess: (data, variables) => {
      const actionLabel = ACTION_LABELS[variables.type as InstanceActionType];
      toast.success(`${actionLabel} sedang diproses...`);
      // Invalidate instance queries to refresh status
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.error?.message ||
        'Gagal menjalankan aksi. Silakan coba lagi.';
      toast.error(message);
    },
  });
}

/**
 * Hook to poll action status
 */
export function useActionStatus(
  instanceId: string | null,
  actionId: number | null,
  options?: { enabled?: boolean }
) {
  return useQuery<InstanceAction>({
    queryKey: ['instances', instanceId, 'actions', actionId],
    queryFn: () => instanceService.getActionStatus(instanceId!, actionId!),
    enabled: !!instanceId && !!actionId && (options?.enabled !== false),
    refetchInterval: (query) => {
      // Stop polling once action is completed or errored
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'errored') {
        return false;
      }
      // Poll every 2 seconds while in progress
      return 2000;
    },
  });
}
