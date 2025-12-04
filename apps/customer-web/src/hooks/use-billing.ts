'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getInvoice,
  getInvoiceByOrderId,
  getInvoices,
  getPaymentChannels,
  initiatePayment,
} from '@/services/billing.service';
import type { InitiatePaymentRequest } from '@/types';

/**
 * Hook to get invoice by ID
 */
export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => getInvoice(invoiceId),
    enabled: !!invoiceId,
  });
}

/**
 * Hook to get invoice by order ID
 */
export function useInvoiceByOrderId(orderId: string) {
  return useQuery({
    queryKey: ['invoice', 'order', orderId],
    queryFn: () => getInvoiceByOrderId(orderId),
    enabled: !!orderId,
  });
}

/**
 * Hook to get list of user invoices
 */
export function useInvoices(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params),
  });
}

/**
 * Hook to get available payment channels
 */
export function usePaymentChannels() {
  return useQuery({
    queryKey: ['payment-channels'],
    queryFn: getPaymentChannels,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to initiate payment
 */
export function useInitiatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: InitiatePaymentRequest;
    }) => initiatePayment(invoiceId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

/**
 * Hook to poll invoice status (for payment confirmation)
 * Stops polling on error to prevent infinite error loops
 */
export function useInvoicePolling(invoiceId: string, enabled = false) {
  return useQuery({
    queryKey: ['invoice', invoiceId, 'polling'],
    queryFn: () => getInvoice(invoiceId),
    enabled: enabled && !!invoiceId,
    refetchInterval: (query) => {
      // Stop polling if there was an error
      if (query.state.status === 'error') {
        return false;
      }
      // Stop polling if invoice is no longer pending
      const invoice = query.state.data;
      if (invoice && invoice.status !== 'PENDING') {
        return false;
      }
      return enabled ? 5000 : false;
    },
    retry: 3, // Limit retries on error
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
