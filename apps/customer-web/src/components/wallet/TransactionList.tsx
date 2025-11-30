'use client';

import type { WalletTransaction } from '@/services/wallet.service';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: WalletTransaction[];
  isLoading?: boolean;
}

/**
 * Component to display wallet transaction history
 */
export function TransactionList({ transactions, isLoading }: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2" data-testid="transaction-list-loading">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-lg border animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="h-4 w-20 bg-muted rounded ml-auto" />
              <div className="h-3 w-24 bg-muted rounded ml-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        data-testid="transaction-list-empty"
      >
        <p>Belum ada transaksi</p>
        <p className="text-sm mt-1">
          Transaksi wallet Anda akan muncul di sini
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="transaction-list">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          data-testid={`transaction-item-${tx.id}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-full',
                tx.type === 'CREDIT'
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {tx.type === 'CREDIT' ? (
                <ArrowDownLeft className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {tx.description || getTransactionLabel(tx.referenceType)}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {formatDate(tx.createdAt)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={cn(
                'font-bold',
                tx.type === 'CREDIT'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {tx.type === 'CREDIT' ? '+' : '-'}
              {formatCurrency(tx.amount)}
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Saldo: {formatCurrency(tx.balanceAfter)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get human-readable label for transaction reference type
 */
function getTransactionLabel(referenceType: string): string {
  const labels: Record<string, string> = {
    DEPOSIT: 'Top Up Saldo',
    ORDER_PAYMENT: 'Pembayaran VPS',
    REFUND: 'Refund',
    BONUS: 'Bonus',
    ADJUSTMENT: 'Penyesuaian Saldo',
  };
  return labels[referenceType] || referenceType;
}
