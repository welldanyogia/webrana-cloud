'use client';

import { Cloud, Activity, AlertTriangle, Server } from 'lucide-react';

import { StatCard } from '@/components/ui/stat-card';
import type { DoAccountStats } from '@/lib/api/do-accounts';

interface DoAccountStatsCardsProps {
  stats: DoAccountStats | null;
  isLoading?: boolean;
}

/**
 * Grid of stat cards displaying DO account statistics
 */
export function DoAccountStatsCards({
  stats,
  isLoading,
}: DoAccountStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 animate-pulse"
          >
            <div className="h-4 w-24 bg-[var(--hover-bg)] rounded mb-2" />
            <div className="h-8 w-16 bg-[var(--hover-bg)] rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Accounts"
        value={stats?.totalAccounts ?? 0}
        description={`${stats?.activeAccounts ?? 0} active`}
        icon={Cloud}
      />
      <StatCard
        title="Healthy Accounts"
        value={stats?.healthyAccounts ?? 0}
        description={
          stats?.unhealthyAccounts
            ? `${stats.unhealthyAccounts} unhealthy`
            : 'All accounts healthy'
        }
        icon={Activity}
      />
      <StatCard
        title="Full Accounts"
        value={stats?.fullAccounts ?? 0}
        description="At droplet limit"
        icon={AlertTriangle}
      />
      <StatCard
        title="Capacity"
        value={`${stats?.totalActiveDroplets ?? 0}/${stats?.totalDropletLimit ?? 0}`}
        description={`${stats?.utilizationPercent?.toFixed(0) ?? 0}% utilized`}
        icon={Server}
      />
    </div>
  );
}
