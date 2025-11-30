import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useWallet,
  useWalletBalance,
  useWalletTransactions,
  useCreateDeposit,
  useDeposits,
  useDeposit,
} from './use-wallet';
import { createWrapper } from '@/test/test-utils';

// Mock the wallet service
vi.mock('@/services/wallet.service', () => ({
  getWalletBalance: vi.fn(),
  getWalletTransactions: vi.fn(),
  createDeposit: vi.fn(),
  getDeposits: vi.fn(),
  getDeposit: vi.fn(),
}));

import {
  getWalletBalance,
  getWalletTransactions,
  createDeposit,
  getDeposits,
  getDeposit,
} from '@/services/wallet.service';

const mockWalletBalance = {
  balance: 500000,
  currency: 'IDR',
};

const mockTransaction = {
  id: 'tx-1',
  type: 'CREDIT' as const,
  amount: 100000,
  balanceBefore: 400000,
  balanceAfter: 500000,
  referenceType: 'DEPOSIT',
  referenceId: 'dep-1',
  description: 'Top Up Saldo',
  createdAt: '2024-01-15T10:00:00Z',
};

const mockTransactionsResponse = {
  data: [mockTransaction],
  meta: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

const mockDeposit = {
  id: 'dep-1',
  amount: 100000,
  bonusAmount: 0,
  totalCredit: 100000,
  status: 'PENDING' as const,
  paymentMethod: 'BRIVA',
  paymentCode: '8077123456789',
  expiresAt: '2024-01-16T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
};

const mockDepositsResponse = {
  data: [mockDeposit],
  meta: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('use-wallet hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useWalletBalance', () => {
    it('should fetch wallet balance', async () => {
      vi.mocked(getWalletBalance).mockResolvedValue(mockWalletBalance);

      const { result } = renderHook(() => useWalletBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockWalletBalance);
      expect(getWalletBalance).toHaveBeenCalled();
    });

    it('should handle error', async () => {
      vi.mocked(getWalletBalance).mockRejectedValue(new Error('Failed to fetch balance'));

      const { result } = renderHook(() => useWalletBalance(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useWalletTransactions', () => {
    it('should fetch wallet transactions', async () => {
      vi.mocked(getWalletTransactions).mockResolvedValue(mockTransactionsResponse);

      const { result } = renderHook(() => useWalletTransactions(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTransactionsResponse);
      expect(getWalletTransactions).toHaveBeenCalledWith(undefined);
    });

    it('should pass filter params', async () => {
      vi.mocked(getWalletTransactions).mockResolvedValue(mockTransactionsResponse);

      const params = { page: 1, limit: 10, type: 'CREDIT' as const };
      const { result } = renderHook(() => useWalletTransactions(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getWalletTransactions).toHaveBeenCalledWith(params);
    });
  });

  describe('useCreateDeposit', () => {
    it('should create deposit successfully', async () => {
      vi.mocked(createDeposit).mockResolvedValue(mockDeposit);

      const { result } = renderHook(() => useCreateDeposit(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ amount: 100000, paymentMethod: 'BRIVA' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(createDeposit).toHaveBeenCalledWith({ amount: 100000, paymentMethod: 'BRIVA' });
    });

    it('should handle deposit error', async () => {
      vi.mocked(createDeposit).mockRejectedValue(new Error('Deposit failed'));

      const { result } = renderHook(() => useCreateDeposit(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ amount: 100000, paymentMethod: 'BRIVA' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeposits', () => {
    it('should fetch deposits list', async () => {
      vi.mocked(getDeposits).mockResolvedValue(mockDepositsResponse);

      const { result } = renderHook(() => useDeposits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDepositsResponse);
    });

    it('should pass filter params', async () => {
      vi.mocked(getDeposits).mockResolvedValue(mockDepositsResponse);

      const params = { status: 'PENDING' as const };
      const { result } = renderHook(() => useDeposits(params), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getDeposits).toHaveBeenCalledWith(params);
    });
  });

  describe('useDeposit', () => {
    it('should fetch deposit by ID', async () => {
      vi.mocked(getDeposit).mockResolvedValue(mockDeposit);

      const { result } = renderHook(() => useDeposit('dep-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDeposit);
      expect(getDeposit).toHaveBeenCalledWith('dep-1');
    });

    it('should not fetch when id is empty', async () => {
      const { result } = renderHook(() => useDeposit(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(getDeposit).not.toHaveBeenCalled();
    });
  });

  describe('useWallet (combined hook)', () => {
    it('should provide balance, transactions, and deposit functionality', async () => {
      vi.mocked(getWalletBalance).mockResolvedValue(mockWalletBalance);
      vi.mocked(getWalletTransactions).mockResolvedValue(mockTransactionsResponse);

      const { result } = renderHook(() => useWallet(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoadingBalance).toBe(false);
        expect(result.current.isLoadingTransactions).toBe(false);
      });

      expect(result.current.balance).toBe(500000);
      expect(result.current.currency).toBe('IDR');
      expect(result.current.transactions).toEqual([mockTransaction]);
    });

    it('should return defaults when loading', async () => {
      vi.mocked(getWalletBalance).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );
      vi.mocked(getWalletTransactions).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useWallet(), {
        wrapper: createWrapper(),
      });

      expect(result.current.balance).toBe(0);
      expect(result.current.currency).toBe('IDR');
      expect(result.current.transactions).toEqual([]);
      expect(result.current.isLoadingBalance).toBe(true);
      expect(result.current.isLoadingTransactions).toBe(true);
    });
  });
});
