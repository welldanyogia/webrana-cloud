import { apiClient } from '@/lib/api-client';
import type {
  InstanceDetail,
  InstanceAction,
  InstanceActionType,
  InstancePaginatedResult,
} from '@/types';

// The instance-service is accessed via api-gateway at /instances
const INSTANCE_API_BASE = '/instances';

/**
 * Fetch all VPS instances for current user
 */
export async function getInstances(params?: {
  page?: number;
  limit?: number;
}): Promise<InstancePaginatedResult> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const queryString = searchParams.toString();
  const url = queryString
    ? `${INSTANCE_API_BASE}?${queryString}`
    : INSTANCE_API_BASE;

  const response = await apiClient.get<InstancePaginatedResult>(url);
  return response.data;
}

/**
 * Fetch single instance by ID with detailed info
 */
export async function getInstance(
  instanceId: string
): Promise<InstanceDetail> {
  const response = await apiClient.get<{ data: InstanceDetail }>(
    `${INSTANCE_API_BASE}/${instanceId}`
  );
  return response.data.data;
}

/**
 * Trigger an action on an instance
 */
export async function triggerAction(
  instanceId: string,
  type: InstanceActionType
): Promise<InstanceAction> {
  const response = await apiClient.post<{ data: InstanceAction }>(
    `${INSTANCE_API_BASE}/${instanceId}/actions`,
    { type }
  );
  return response.data.data;
}

/**
 * Get action status
 */
export async function getActionStatus(
  instanceId: string,
  actionId: number
): Promise<InstanceAction> {
  const response = await apiClient.get<{ data: InstanceAction }>(
    `${INSTANCE_API_BASE}/${instanceId}/actions/${actionId}`
  );
  return response.data.data;
}

export const instanceService = {
  getInstances,
  getInstance,
  triggerAction,
  getActionStatus,
};

export default instanceService;
