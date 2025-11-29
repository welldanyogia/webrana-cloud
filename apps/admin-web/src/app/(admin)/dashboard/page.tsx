'use client';

import Link from 'next/link';
import {
  ShoppingCart,
  Clock,
  CreditCard,
  Server,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { useAdminRecentOrders } from '@/hooks/use-admin-orders';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatRelativeTime,
  getOrderStatusLabel,
  getOrderStatusVariant,
} from '@/lib/utils';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: recentOrders, isLoading: ordersLoading } = useAdminRecentOrders(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Ringkasan aktivitas platform hari ini
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Pesanan Hari Ini"
              value={stats?.ordersToday ?? 0}
              description="Total pesanan baru"
              icon={ShoppingCart}
            />
            <StatCard
              title="Menunggu Pembayaran"
              value={stats?.pendingPayment ?? 0}
              description="Perlu tindakan admin"
              icon={Clock}
            />
            <StatCard
              title="Pendapatan Hari Ini"
              value={formatCurrency(stats?.revenueToday ?? 0)}
              description="Total transaksi sukses"
              icon={CreditCard}
            />
            <StatCard
              title="VPS Aktif"
              value={stats?.activeVps ?? 0}
              description="Server yang berjalan"
              icon={Server}
            />
          </>
        )}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pesanan Terbaru</CardTitle>
          <Link
            href="/orders"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 font-medium transition-colors"
          >
            Lihat Semua
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--hover-bg)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--text-primary)] truncate">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <Badge variant={getOrderStatusVariant(order.status)} size="sm">
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {order.userEmail || 'Unknown'} • {formatRelativeTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-6 w-6 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-1">
                Belum Ada Pesanan
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Pesanan baru akan muncul di sini
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Akses Cepat
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/orders?status=PENDING_PAYMENT"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--warning-bg)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Pending Payment
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Konfirmasi pembayaran
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/orders"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--primary-muted)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Semua Pesanan
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Kelola pesanan
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/users"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--success-bg)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg
                  className="h-4 w-4 text-[var(--success)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Pengguna
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Kelola pengguna
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
