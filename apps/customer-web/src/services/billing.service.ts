import axios from 'axios';

import apiClient from '@/lib/api-client';
import type {
  ApiResponse,
  Invoice,
  PaymentChannel,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
} from '@/types';

const BILLING_BASE = '/invoices';

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const response = await apiClient.get<ApiResponse<Invoice>>(
    `${BILLING_BASE}/${invoiceId}`
  );
  return response.data.data;
}

/**
 * Get invoice by order ID
 * Returns null if invoice is not found (404), re-throws other errors
 */
export async function getInvoiceByOrderId(orderId: string): Promise<Invoice | null> {
  try {
    const response = await apiClient.get<ApiResponse<Invoice>>(
      `${BILLING_BASE}/order/${orderId}`
    );
    return response.data.data;
  } catch (error) {
    // Only return null for 404 (not found)
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    // Re-throw other errors (network, 500, etc.)
    throw error;
  }
}

/**
 * Get list of user invoices
 */
export async function getInvoices(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ data: Invoice[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const response = await apiClient.get<{
    data: Invoice[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>(BILLING_BASE, { params });
  return response.data;
}

/**
 * Get available payment channels
 */
export async function getPaymentChannels(): Promise<PaymentChannel[]> {
  const response = await apiClient.get<ApiResponse<PaymentChannel[]>>(
    '/payment-channels'
  );
  return response.data.data;
}

/**
 * Initiate payment for an invoice
 */
export async function initiatePayment(
  invoiceId: string,
  data: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> {
  const response = await apiClient.post<ApiResponse<InitiatePaymentResponse>>(
    `${BILLING_BASE}/${invoiceId}/pay`,
    data
  );
  return response.data.data;
}
