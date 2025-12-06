'use client';

import { Wallet, Plus, RefreshCw, History, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepositModal, TransactionList } from '@/components/wallet';
import { useWallet } from '@/hooks/use-wallet';
import { useWalletTransactions } from '@/hooks/use-wallet';
import { formatCurrency } from '@/lib/utils';

export default function WalletPage() {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'CREDIT' | 'DEBIT'>('all');
  const { balance, isLoadingBalance, refetchAll } = useWallet();

  // Fetch transactions with filter
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
  } = useWalletTransactions({
    limit: 20,
    type: transactionFilter === 'all' ? undefined : transactionFilter,
  });

  const transactions = transactionsData?.data ?? [];

  const handleRefresh = () => {
    refetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Wallet Saya</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Kelola saldo dan lihat riwayat transaksi
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="self-start sm:self-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm opacity-90 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Saldo Tersedia
              </p>
              {isLoadingBalance ? (
                <Skeleton className="h-10 w-48 bg-white/20" />
              ) : (
                <p className="text-4xl font-bold tracking-tight" data-testid="wallet-balance">
                  {formatCurrency(balance)}
                </p>
              )}
            </div>
            <Button
              onClick={() => setShowDepositModal(true)}
              size="lg"
              className="bg-white text-[#6366f1] hover:bg-white/90 font-semibold shadow-lg"
              data-testid="topup-button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Top Up
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Riwayat Transaksi
            </CardTitle>
            <Tabs
              value={transactionFilter}
              onValueChange={(value) => setTransactionFilter(value as typeof transactionFilter)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                <TabsTrigger value="all" data-testid="filter-all">
                  Semua
                </TabsTrigger>
                <TabsTrigger value="CREDIT" data-testid="filter-credit">
                  <ArrowDownLeft className="h-3 w-3 mr-1" />
                  Masuk
                </TabsTrigger>
                <TabsTrigger value="DEBIT" data-testid="filter-debit">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  Keluar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            isLoading={isLoadingTransactions}
          />
        </CardContent>
      </Card>

      {/* Deposit Modal */}
      <DepositModal
        open={showDepositModal}
        onClose={() => setShowDepositModal(false)}
      />
    </div>
  );
}
