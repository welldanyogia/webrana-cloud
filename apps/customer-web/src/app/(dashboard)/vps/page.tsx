'use client';

import { Plus, Server, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VpsCard, VpsEmptyState } from '@/components/vps';
import { VpsCardSkeleton } from '@/components/skeletons/VpsCardSkeleton';
import { useVpsList } from '@/hooks/use-vps';
import type { VpsOrderStatus } from '@/services/vps.service';

// Filter tabs configuration
type FilterTab = 'all' | 'active' | 'expiring' | 'suspended';

const FILTER_TABS: { value: FilterTab; label: string; statuses?: VpsOrderStatus[] }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif', statuses: ['ACTIVE', 'PROVISIONING', 'PROCESSING'] },
  { value: 'expiring', label: 'Segera Berakhir', statuses: ['EXPIRING_SOON', 'EXPIRED'] },
  { value: 'suspended', label: 'Ditangguhkan', statuses: ['SUSPENDED', 'TERMINATED'] },
];

export default function VPSPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Get the status filter for the API call
  const statusFilter = activeTab === 'all' 
    ? undefined 
    : FILTER_TABS.find(t => t.value === activeTab)?.statuses?.join(',');

  const {
    data: vpsResponse,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useVpsList({ limit: 50, status: statusFilter });

  const vpsList = vpsResponse?.data ?? [];

  // Filter VPS list based on active tab (client-side fallback)
  const filteredVps = activeTab === 'all' 
    ? vpsList 
    : vpsList.filter(vps => {
        const tab = FILTER_TABS.find(t => t.value === activeTab);
        return tab?.statuses?.includes(vps.status);
      });

  // Count VPS by category for tab badges
  const counts = {
    all: vpsList.length,
    active: vpsList.filter(v => ['ACTIVE', 'PROVISIONING', 'PROCESSING'].includes(v.status)).length,
    expiring: vpsList.filter(v => ['EXPIRING_SOON', 'EXPIRED'].includes(v.status)).length,
    suspended: vpsList.filter(v => ['SUSPENDED', 'TERMINATED'].includes(v.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Server className="h-7 w-7 text-[var(--primary)]" />
            Server Saya
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Kelola dan monitor VPS Anda
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          {/* Create VPS Button */}
          <Link href="/catalog">
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              Buat VPS Baru
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
        <TabsList className="w-full sm:w-auto bg-[var(--surface)] border border-[var(--border)] p-1">
          {FILTER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="relative data-[state=active]:bg-[var(--card-bg)]"
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {counts[tab.value] > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    {counts[tab.value]}
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Error State */}
        {isError && (
          <Card className="mt-6">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                Gagal Memuat Data
              </h3>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                Terjadi kesalahan saat memuat data VPS Anda. Silakan coba lagi.
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <VpsCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* VPS List Content */}
        {!isLoading && !isError && (
          <>
            {filteredVps.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredVps.map((vps) => (
                  <VpsCard key={vps.id} vps={vps} />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                {activeTab === 'all' ? (
                  <Card>
                    <VpsEmptyState />
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Filter className="h-8 w-8 text-[var(--text-muted)]" />
                      </div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                        Tidak Ada VPS
                      </h3>
                      <p className="text-[var(--text-secondary)] mb-4">
                        Tidak ada VPS dengan status &quot;{FILTER_TABS.find(t => t.value === activeTab)?.label}&quot;
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('all')}
                      >
                        Lihat Semua VPS
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </Tabs>

      {/* Quick Stats Summary (when there are VPS) */}
      {!isLoading && !isError && vpsList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
            <p className="text-2xl font-bold text-emerald-500">{counts.active}</p>
            <p className="text-xs text-[var(--text-muted)]">VPS Aktif</p>
          </div>
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
            <p className="text-2xl font-bold text-amber-500">{counts.expiring}</p>
            <p className="text-xs text-[var(--text-muted)]">Segera Berakhir</p>
          </div>
          <div className="rounded-xl bg-orange-500/5 border border-orange-500/20 p-4">
            <p className="text-2xl font-bold text-orange-500">{counts.suspended}</p>
            <p className="text-xs text-[var(--text-muted)]">Ditangguhkan</p>
          </div>
          <div className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-4">
            <p className="text-2xl font-bold text-[var(--primary)]">{counts.all}</p>
            <p className="text-xs text-[var(--text-muted)]">Total VPS</p>
          </div>
        </div>
      )}

      {/* All Orders History Link */}
      {!isLoading && !isError && (
        <div className="text-center">
          <Link
            href="/invoices"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
          >
            Lihat Semua Riwayat Pesanan →
          </Link>
        </div>
      )}
    </div>
  );
}
