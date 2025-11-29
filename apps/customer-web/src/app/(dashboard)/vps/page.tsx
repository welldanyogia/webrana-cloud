'use client';

import Link from 'next/link';
import {
  Server,
  Power,
  RefreshCw,
  Terminal,
  MoreVertical,
  Plus,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/use-orders';
import { formatRelativeTime, getOrderStatusLabel } from '@/lib/utils';
import type { OrderStatus } from '@/types';

function VpsListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div>
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getStatusBadgeVariant(
  status: OrderStatus
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING_PAYMENT':
      return 'warning';
    case 'PAYMENT_RECEIVED':
    case 'PROVISIONING':
      return 'info';
    case 'FAILED':
    case 'CANCELLED':
    case 'EXPIRED':
      return 'danger';
    default:
      return 'default';
  }
}

export default function VPSPage() {
  const { data: ordersResponse, isLoading, isError, refetch } = useOrders({
    limit: 50,
  });

  const orders = ordersResponse?.items ?? [];

  // Filter to show only relevant orders (active, provisioning, or pending payment)
  const relevantOrders = orders.filter((order) =>
    ['ACTIVE', 'PROVISIONING', 'PENDING_PAYMENT', 'PAYMENT_RECEIVED'].includes(
      order.status
    )
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            VPS Saya
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Kelola dan monitor server virtual Anda
          </p>
        </div>
        <Link href="/catalog">
          <Button leftIcon={<Plus className="h-4 w-4" />}>Buat VPS Baru</Button>
        </Link>
      </div>

      {/* Error State */}
      {isError && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-[var(--error)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Gagal Memuat Data
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Terjadi kesalahan saat memuat data VPS Anda. Silakan coba lagi.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && <VpsListSkeleton />}

      {/* VPS List */}
      {!isLoading && !isError && relevantOrders.length > 0 && (
        <div className="space-y-4">
          {relevantOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-4">
                  {/* Instance Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[var(--primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Server className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {order.hostname}
                        </h3>
                        <Badge
                          variant={getStatusBadgeVariant(order.status)}
                          dot
                        >
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] font-mono mb-1">
                        {order.orderNumber || `Order #${order.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Dibuat {formatRelativeTime(order.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {order.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Buka Console"
                          disabled
                        >
                          <Terminal className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Restart Server"
                          disabled
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Matikan/Nyalakan"
                          disabled
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Link href={`/order/${order.id}`}>
                      <Button variant="outline" size="sm">
                        {order.status === 'PENDING_PAYMENT' ? 'Bayar' : 'Kelola'}
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" disabled>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && relevantOrders.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Belum Ada VPS
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Anda belum memiliki VPS aktif. Buat VPS pertama Anda sekarang dan
              mulai deploy dalam hitungan menit.
            </p>
            <Link href="/catalog">
              <Button>
                Buat VPS Pertama
                <Plus className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* All Orders History Link */}
      {!isLoading && !isError && orders.length > 0 && (
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
