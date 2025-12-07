'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { localApiClient } from '@/lib/api-client';

// Types
export interface DoSize {
  slug: string;
  memory: number;
  vcpus: number;
  disk: number;
  transfer: number;
  price_monthly: number;
  price_hourly: number;
  regions: string[];
  available: boolean;
  description: string;
}

export interface DoRegion {
  slug: string;
  name: string;
  sizes: string[];
  available: boolean;
  features: string[];
}

export interface DoImage {
  id: number;
  name: string;
  distribution: string;
  slug: string | null;
  public: boolean;
  regions: string[];
  created_at: string;
  min_disk_size: number;
  type: string;
  size_gigabytes: number;
  description: string | null;
  status: string;
}

export interface VpsPlan {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  cpu: number;
  memoryMb: number;
  diskGb: number;
  bandwidthTb: number;
  provider: string;
  providerSizeSlug: string;
  isActive: boolean;
  sortOrder: number;
  tags: string[];
  priceHourly?: number;
  priceDaily?: number;
  priceMonthly?: number;
  priceYearly?: number;
  allowDaily: boolean;
  allowMonthly: boolean;
  allowYearly: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  name: string;
  displayName: string;
  description?: string;
  cpu: number;
  memoryMb: number;
  diskGb: number;
  bandwidthTb: number;
  provider: string;
  providerSizeSlug: string;
  isActive?: boolean;
  sortOrder?: number;
  tags?: string[];
  priceHourly?: number;
  priceDaily?: number;
  priceMonthly?: number;
  priceYearly?: number;
  allowDaily?: boolean;
  allowMonthly?: boolean;
  allowYearly?: boolean;
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {}

// Hooks for DO Catalog
export function useDoSizes() {
  return useQuery({
    queryKey: ['do-sizes'],
    queryFn: async () => {
      const response = await localApiClient.get('/api/admin/do-catalog/sizes');
      return response.data.data as DoSize[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDoRegions() {
  return useQuery({
    queryKey: ['do-regions'],
    queryFn: async () => {
      const response = await localApiClient.get('/api/admin/do-catalog/regions');
      return response.data.data as DoRegion[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDoImages() {
  return useQuery({
    queryKey: ['do-images'],
    queryFn: async () => {
      const response = await localApiClient.get('/api/admin/do-catalog/images');
      return response.data.data as DoImage[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hooks for Plans
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await localApiClient.get('/api/admin/plans');
      return response.data.data as VpsPlan[];
    },
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: ['plans', id],
    queryFn: async () => {
      const response = await localApiClient.get(`/api/admin/plans/${id}`);
      return response.data.data as VpsPlan;
    },
    enabled: !!id,
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePlanDto) => {
      const response = await localApiClient.post('/api/admin/plans', data);
      return response.data.data as VpsPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan berhasil dibuat');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal membuat plan');
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePlanDto }) => {
      const response = await localApiClient.patch(`/api/admin/plans/${id}`, data);
      return response.data.data as VpsPlan;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['plans', id] });
      toast.success('Plan berhasil diupdate');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal mengupdate plan');
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await localApiClient.delete(`/api/admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan berhasil dihapus');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Gagal menghapus plan');
    },
  });
}
