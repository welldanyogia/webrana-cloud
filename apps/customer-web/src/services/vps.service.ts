import { apiClient } from '@/lib/api-client';

// ============================================
// VPS Order Types (Based on Order Service)
// ============================================

export type VpsOrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'TERMINATED'
  | 'FAILED'
  | 'CANCELED';

export type BillingPeriod = 'DAILY' | 'MONTHLY' | 'YEARLY';

export interface VpsProvisioningTask {
  id: string;
  status: string;
  ipv4Public: string | null;
  ipv4Private: string | null;
  dropletId: string | null;
  dropletStatus: string | null;
  doRegion: string | null;
  doSize: string | null;
}

export interface VpsOrder {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  imageId: string;
  imageName: string;
  billingPeriod: BillingPeriod;
  status: VpsOrderStatus;
  basePrice: number;
  promoDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  finalPrice: number;
  autoRenew: boolean;
  expiresAt: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  terminatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Optional nested relations
  provisioningTask?: VpsProvisioningTask;
  plan?: {
    id: string;
    name: string;
    vcpu: number;
    memory: number;
    disk: number;
    bandwidth: number;
  };
  image?: {
    id: string;
    name: string;
    distribution: string;
  };
}

export interface VpsListResponse {
  data: VpsOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VpsDetailResponse {
  data: VpsOrder;
}

export interface VpsListParams {
  page?: number;
  limit?: number;
  status?: string;
}

// ============================================
// VPS Service
// ============================================

const VPS_API_BASE = '/orders';

/**
 * VPS Service - Manages VPS orders with lifecycle operations
 */
export const vpsService = {
  /**
   * List user's VPS orders
   */
  async list(params?: VpsListParams): Promise<VpsListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    const url = queryString ? `${VPS_API_BASE}?${queryString}` : VPS_API_BASE;

    const response = await apiClient.get<VpsListResponse>(url);
    return response.data;
  },

  /**
   * Get single VPS order details
   */
  async getById(id: string): Promise<VpsOrder> {
    const response = await apiClient.get<VpsDetailResponse>(`${VPS_API_BASE}/${id}`);
    return response.data.data;
  },

  /**
   * Power on VPS (via instance service)
   */
  async powerOn(id: string): Promise<void> {
    await apiClient.post(`${VPS_API_BASE}/${id}/power-on`);
  },

  /**
   * Power off VPS (via instance service)
   */
  async powerOff(id: string): Promise<void> {
    await apiClient.post(`${VPS_API_BASE}/${id}/power-off`);
  },

  /**
   * Reboot VPS (via instance service)
   */
  async reboot(id: string): Promise<void> {
    await apiClient.post(`${VPS_API_BASE}/${id}/reboot`);
  },

  /**
   * Toggle auto-renewal setting
   */
  async toggleAutoRenew(id: string, enabled: boolean): Promise<void> {
    await apiClient.patch(`${VPS_API_BASE}/${id}/auto-renew`, { autoRenew: enabled });
  },

  /**
   * Manual renewal - extend VPS lifetime
   */
  async manualRenew(id: string): Promise<void> {
    await apiClient.post(`${VPS_API_BASE}/${id}/renew`);
  },

  /**
   * Delete VPS (user-initiated termination)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${VPS_API_BASE}/${id}`);
  },

  /**
   * Rebuild VPS with new OS image
   */
  async rebuild(id: string, imageId: string): Promise<void> {
    await apiClient.post(`${VPS_API_BASE}/${id}/rebuild`, { imageId });
  },

  /**
   * Get VNC console URL
   */
  async getConsoleUrl(id: string): Promise<{ url: string }> {
    const response = await apiClient.get<{ data: { url: string } }>(`${VPS_API_BASE}/${id}/console`);
    return response.data.data;
  },
};

export default vpsService;
