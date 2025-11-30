import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/types';

// Wallet types
export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  amount: number;
  bonusAmount: number;
  totalCredit: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
  paymentMethod?: string;
  paymentCode?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

export interface CreateDepositDto {
  amount: number;
  paymentMethod: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const WALLET_BASE = '/wallet';

/**
 * Get wallet balance
 */
export async function getWalletBalance(): Promise<WalletBalance> {
  const response = await apiClient.get<ApiResponse<WalletBalance>>(WALLET_BASE);
  return response.data.data;
}

/**
 * Get wallet transactions
 */
export async function getWalletTransactions(params?: {
  page?: number;
  limit?: number;
  type?: 'CREDIT' | 'DEBIT';
}): Promise<{ data: WalletTransaction[]; meta: PaginatedMeta }> {
  const response = await apiClient.get<{
    data: WalletTransaction[];
    meta: PaginatedMeta;
  }>(`${WALLET_BASE}/transactions`, { params });
  return response.data;
}

/**
 * Create a new deposit
 */
export async function createDeposit(data: CreateDepositDto): Promise<Deposit> {
  const response = await apiClient.post<ApiResponse<Deposit>>(
    `${WALLET_BASE}/deposit`,
    data
  );
  return response.data.data;
}

/**
 * Get list of deposits
 */
export async function getDeposits(params?: {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';
}): Promise<{ data: Deposit[]; meta: PaginatedMeta }> {
  const response = await apiClient.get<{
    data: Deposit[];
    meta: PaginatedMeta;
  }>(`${WALLET_BASE}/deposits`, { params });
  return response.data;
}

/**
 * Get deposit by ID
 */
export async function getDeposit(id: string): Promise<Deposit> {
  const response = await apiClient.get<ApiResponse<Deposit>>(
    `${WALLET_BASE}/deposits/${id}`
  );
  return response.data.data;
}
