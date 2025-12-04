import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  useInvoice,
  useInvoiceByOrderId,
  useInvoices,
  usePaymentChannels,
  useInitiatePayment,
} from './use-billing';

import { createWrapper } from '@/test/test-utils';

// Mock the billing service
vi.mock('@/services/billing.service', () => ({
  getInvoice: vi.fn(),
  getInvoiceByOrderId: vi.fn(),
  getInvoices: vi.fn(),
  getPaymentChannels: vi.fn(),
  initiatePayment: vi.fn(),
}));

import {
  getInvoice,
  getInvoiceByOrderId,
  getInvoices,
  getPaymentChannels,
  initiatePayment,
} from '@/services/billing.service';

const mockInvoice = {
  id: 'inv-1',
  orderId: 'order-1',
  invoiceNumber: 'INV-2024-001',
  amount: 150000,
  status: 'PENDING' as const,
  paymentUrl: 'https://payment.example.com/pay',
  expiredAt: '2024-01-02T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
};

const mockInvoicesResponse = {
  data: [mockInvoice],
  meta: {
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
};

const mockPaymentChannels = [
  {
    code: 'BRIVA',
    name: 'BRI Virtual Account',
    group: 'Virtual Account',
    type: 'virtual_account' as const,
    fee: { flat: 4000, percent: 0 },
    iconUrl: 'https://example.com/bri.png',
  },
  {
    code: 'QRIS',
    name: 'QRIS',
    group: 'E-Wallet',
    type: 'qris' as const,
    fee: { flat: 0, percent: 0.7 },
    iconUrl: 'https://example.com/qris.png',
  },
];

describe('use-billing hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useInvoice', () => {
    it('should fetch invoice by ID', async () => {
      vi.mocked(getInvoice).mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useInvoice('inv-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoice);
      expect(getInvoice).toHaveBeenCalledWith('inv-1');
    });

    it('should not fetch when invoiceId is empty', async () => {
      const { result } = renderHook(() => useInvoice(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(getInvoice).not.toHaveBeenCalled();
    });

    it('should handle error', async () => {
      vi.mocked(getInvoice).mockRejectedValue(new Error('Invoice not found'));

      const { result } = renderHook(() => useInvoice('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useInvoiceByOrderId', () => {
    it('should fetch invoice by order ID', async () => {
      vi.mocked(getInvoiceByOrderId).mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useInvoiceByOrderId('order-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoice);
      expect(getInvoiceByOrderId).toHaveBeenCalledWith('order-1');
    });

    it('should not fetch when orderId is empty', async () => {
      const { result } = renderHook(() => useInvoiceByOrderId(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(getInvoiceByOrderId).not.toHaveBeenCalled();
    });
  });

  describe('useInvoices', () => {
    it('should fetch invoices list', async () => {
      vi.mocked(getInvoices).mockResolvedValue(mockInvoicesResponse);

      const { result } = renderHook(() => useInvoices(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoicesResponse);
      expect(getInvoices).toHaveBeenCalledWith(undefined);
    });

    it('should pass filter params', async () => {
      vi.mocked(getInvoices).mockResolvedValue(mockInvoicesResponse);

      const params = { page: 2, limit: 5, status: 'PAID' };
      const { result } = renderHook(() => useInvoices(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getInvoices).toHaveBeenCalledWith(params);
    });
  });

  describe('usePaymentChannels', () => {
    it('should fetch payment channels', async () => {
      vi.mocked(getPaymentChannels).mockResolvedValue(mockPaymentChannels);

      const { result } = renderHook(() => usePaymentChannels(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPaymentChannels);
    });
  });

  describe('useInitiatePayment', () => {
    it('should initiate payment successfully', async () => {
      const mockResponse = {
        invoice: mockInvoice,
        payment: {
          channel: 'BRIVA',
          channelName: 'BRI Virtual Account',
          paymentCode: '8077123456789',
          paymentUrl: 'https://payment.example.com/pay',
          totalAmount: 154000,
          fee: 4000,
          expiredAt: '2024-01-02T00:00:00Z',
        },
      };
      vi.mocked(initiatePayment).mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useInitiatePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        invoiceId: 'inv-1',
        data: { channel: 'BRIVA' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(initiatePayment).toHaveBeenCalledWith('inv-1', { channel: 'BRIVA' });
    });

    it('should handle payment error', async () => {
      vi.mocked(initiatePayment).mockRejectedValue(new Error('Payment failed'));

      const { result } = renderHook(() => useInitiatePayment(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        invoiceId: 'inv-1',
        data: { channel: 'BRIVA' },
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
