'use client';

import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { OrdersChart, RevenueChart, PlansChart } from '@/components/charts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import {
  getDailyStats,
  getPlanDistribution,
  getAnalyticsSummary,
  type DailyStats,
  type PlanDistribution,
  type AnalyticsSummary,
} from '@/services/analytics.service';

type DateRange = '7' | '30' | '90';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: '7 Hari Terakhir' },
  { value: '30', label: '30 Hari Terakhir' },
  { value: '90', label: '90 Hari Terakhir' },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30');
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const days = parseInt(dateRange, 10);
      const [stats, plans, summaryData] = await Promise.all([
        getDailyStats(days),
        getPlanDistribution(),
        getAnalyticsSummary(days),
      ]);
      setDailyStats(stats);
      setPlanDistribution(plans);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDateRange(e.target.value as DateRange);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Analitik
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Statistik dan laporan platform
          </p>
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={DATE_RANGE_OPTIONS}
            value={dateRange}
            onChange={handleDateRangeChange}
            aria-label="Pilih rentang waktu"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Pesanan"
              value={summary?.totalOrders ?? 0}
              description={`${dateRange} hari terakhir`}
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Pendapatan"
              value={formatCurrency(summary?.totalRevenue ?? 0)}
              description={`${dateRange} hari terakhir`}
              icon={DollarSign}
            />
            <StatCard
              title="Rata-rata Nilai Order"
              value={formatCurrency(summary?.averageOrderValue ?? 0)}
              description="Per transaksi"
              icon={BarChart3}
            />
            <StatCard
              title="Pertumbuhan"
              value={`${(summary?.growthRate ?? 0) >= 0 ? '+' : ''}${summary?.growthRate ?? 0}%`}
              description="Dibanding periode sebelumnya"
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Orders per Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle size="sm">Pesanan per Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersChart data={dailyStats} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Revenue per Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle size="sm">Pendapatan per Hari</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={dailyStats} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle size="sm">Distribusi Paket VPS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-lg mx-auto">
            <PlansChart data={planDistribution} isLoading={isLoading} />
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-center py-4">
        <p className="text-xs text-[var(--text-muted)]">
          Data diperbarui secara berkala. Terakhir dimuat:{' '}
          {new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date())}
        </p>
      </div>
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
