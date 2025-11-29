'use client';

import Link from 'next/link';
import {
  Server,
  Clock,
  CreditCard,
  ShoppingCart,
  ArrowRight,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useOrderStats, useRecentOrders } from '@/hooks/use-dashboard';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SkeletonCard, Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatRelativeTime,
  getOrderStatusLabel,
} from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useOrderStats();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Halo, {user?.name || 'User'}!
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Selamat datang kembali di dashboard
          </p>
        </div>
        <Link href="/catalog">
          <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
            Pesan VPS Baru
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="VPS Aktif"
              value={stats?.activeVps ?? 0}
              description="Server yang sedang berjalan"
              icon={Server}
            />
            <StatCard
              title="Menunggu Pembayaran"
              value={stats?.pendingOrders ?? 0}
              description="Pesanan yang belum dibayar"
              icon={Clock}
            />
            <StatCard
              title="Total Pengeluaran"
              value={formatCurrency(stats?.totalSpent ?? 0)}
              description="Akumulasi transaksi Anda"
              icon={CreditCard}
            />
          </>
        )}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pesanan Terbaru</CardTitle>
          <Link
            href="/invoices"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] flex items-center gap-1 font-medium transition-colors"
          >
            Lihat Semua
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {ordersLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3"
                >
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
                  href={`/order/${order.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--hover-bg)] transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {formatRelativeTime(order.createdAt)} • {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        order.status === 'ACTIVE'
                          ? 'success'
                          : order.status === 'PENDING_PAYMENT'
                          ? 'warning'
                          : order.status === 'FAILED'
                          ? 'danger'
                          : 'default'
                      }
                    >
                      {getOrderStatusLabel(order.status)}
                    </Badge>
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
              <p className="text-[var(--text-primary)] font-medium mb-1">Belum Ada Pesanan</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">Buat pesanan VPS pertama Anda dan mulai dalam hitungan menit</p>
              <Link href="/catalog">
                <Button variant="outline" size="sm">
                  Lihat Paket VPS
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">
          Akses Cepat
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/catalog"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--primary-muted)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Beli VPS</p>
                <p className="text-xs text-[var(--text-muted)]">Lihat paket</p>
              </div>
            </div>
          </Link>

          <Link
            href="/vps"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--success-bg)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <Server className="h-4 w-4 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">VPS Saya</p>
                <p className="text-xs text-[var(--text-muted)]">Kelola server</p>
              </div>
            </div>
          </Link>

          <Link
            href="/invoices"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--warning-bg)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="h-4 w-4 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Tagihan</p>
                <p className="text-xs text-[var(--text-muted)]">Riwayat bayar</p>
              </div>
            </div>
          </Link>

          <Link
            href="/profile"
            className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--info-bg)] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
                <svg
                  className="h-4 w-4 text-[var(--info)]"
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
                <p className="text-sm font-medium text-[var(--text-primary)]">Profil</p>
                <p className="text-xs text-[var(--text-muted)]">Pengaturan</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
