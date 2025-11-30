import { localApiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

/**
 * DigitalOcean Account interface
 */
export interface DoAccount {
  id: string;
  name: string;
  email: string;
  dropletLimit: number;
  activeDroplets: number;
  isActive: boolean;
  isPrimary: boolean;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  lastHealthCheck: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DO Account Statistics
 */
export interface DoAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  healthyAccounts: number;
  unhealthyAccounts: number;
  fullAccounts: number;
  totalDropletLimit: number;
  totalActiveDroplets: number;
  utilizationPercent: number;
}

/**
 * DTO for creating a new DO account
 */
export interface CreateDoAccountDto {
  name: string;
  email: string;
  accessToken: string;
  isPrimary?: boolean;
}

/**
 * DTO for updating a DO account
 */
export interface UpdateDoAccountDto {
  name?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  accountId: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
  message?: string;
  checkedAt: string;
}

/**
 * Get all DO accounts
 */
export async function getDoAccounts(): Promise<DoAccount[]> {
  const response = await localApiClient.get<ApiResponse<DoAccount[]>>(
    '/api/admin/do-accounts'
  );
  return response.data.data;
}

/**
 * Get DO account by ID
 */
export async function getDoAccountById(id: string): Promise<DoAccount> {
  const response = await localApiClient.get<ApiResponse<DoAccount>>(
    `/api/admin/do-accounts/${id}`
  );
  return response.data.data;
}

/**
 * Create a new DO account
 */
export async function createDoAccount(data: CreateDoAccountDto): Promise<DoAccount> {
  const response = await localApiClient.post<ApiResponse<DoAccount>>(
    '/api/admin/do-accounts',
    data
  );
  return response.data.data;
}

/**
 * Update a DO account
 */
export async function updateDoAccount(
  id: string,
  data: UpdateDoAccountDto
): Promise<DoAccount> {
  const response = await localApiClient.patch<ApiResponse<DoAccount>>(
    `/api/admin/do-accounts/${id}`,
    data
  );
  return response.data.data;
}

/**
 * Delete a DO account
 */
export async function deleteDoAccount(id: string): Promise<void> {
  await localApiClient.delete(`/api/admin/do-accounts/${id}`);
}

/**
 * Sync a single DO account (refresh droplet info)
 */
export async function syncDoAccount(id: string): Promise<DoAccount> {
  const response = await localApiClient.post<ApiResponse<DoAccount>>(
    `/api/admin/do-accounts/${id}/sync`
  );
  return response.data.data;
}

/**
 * Sync all DO accounts
 */
export async function syncAllDoAccounts(): Promise<{ synced: number }> {
  const response = await localApiClient.post<ApiResponse<{ synced: number }>>(
    '/api/admin/do-accounts/sync-all'
  );
  return response.data.data;
}

/**
 * Perform health check for a single DO account
 */
export async function healthCheckDoAccount(id: string): Promise<HealthCheckResult> {
  const response = await localApiClient.get<ApiResponse<HealthCheckResult>>(
    `/api/admin/do-accounts/${id}/health`
  );
  return response.data.data;
}

/**
 * Get DO accounts statistics
 */
export async function getDoAccountStats(): Promise<DoAccountStats> {
  const response = await localApiClient.get<ApiResponse<DoAccountStats>>(
    '/api/admin/do-accounts/stats'
  );
  return response.data.data;
}

/**
 * Bundled service export for consistent usage
 */
export const doAccountsService = {
  getDoAccounts,
  getDoAccountById,
  createDoAccount,
  updateDoAccount,
  deleteDoAccount,
  syncDoAccount,
  syncAllDoAccounts,
  healthCheckDoAccount,
  getDoAccountStats,
};

export default doAccountsService;
