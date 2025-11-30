'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWalletBalance,
  getWalletTransactions,
  createDeposit,
  getDeposits,
  getDeposit,
  type CreateDepositDto,
  type WalletTransaction,
} from '@/services/wallet.service';

/**
 * Hook to get wallet balance
 */
export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: getWalletBalance,
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 10000, // Consider stale after 10s
  });
}

/**
 * Hook to get wallet transactions
 */
export function useWalletTransactions(params?: {
  page?: number;
  limit?: number;
  type?: 'CREDIT' | 'DEBIT';
}) {
  return useQuery({
    queryKey: ['wallet', 'transactions', params],
    queryFn: () => getWalletTransactions(params),
  });
}

/**
 * Hook to create a deposit
 */
export function useCreateDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDepositDto) => createDeposit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

/**
 * Hook to get list of deposits
 */
export function useDeposits(params?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
}) {
  return useQuery({
    queryKey: ['wallet', 'deposits', params],
    queryFn: () => getDeposits(params),
  });
}

/**
 * Hook to get deposit by ID
 */
export function useDeposit(id: string) {
  return useQuery({
    queryKey: ['wallet', 'deposit', id],
    queryFn: () => getDeposit(id),
    enabled: !!id,
  });
}

/**
 * Combined wallet hook for convenience
 * Provides balance, transactions, and deposit functionality
 */
export function useWallet() {
  const queryClient = useQueryClient();

  const balanceQuery = useWalletBalance();
  const transactionsQuery = useWalletTransactions({ limit: 20 });
  const createDepositMutation = useCreateDeposit();

  return {
    // Balance
    balance: balanceQuery.data?.balance ?? 0,
    currency: balanceQuery.data?.currency ?? 'IDR',
    isLoadingBalance: balanceQuery.isLoading,
    balanceError: balanceQuery.error,

    // Transactions
    transactions: transactionsQuery.data?.data ?? [] as WalletTransaction[],
    transactionsMeta: transactionsQuery.data?.meta,
    isLoadingTransactions: transactionsQuery.isLoading,
    transactionsError: transactionsQuery.error,

    // Deposit mutation
    createDeposit: createDepositMutation.mutateAsync,
    isCreatingDeposit: createDepositMutation.isPending,
    createDepositError: createDepositMutation.error,

    // Refresh functions
    refetchBalance: () => queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
    refetchTransactions: () => queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] }),
    refetchAll: () => queryClient.invalidateQueries({ queryKey: ['wallet'] }),
  };
}
