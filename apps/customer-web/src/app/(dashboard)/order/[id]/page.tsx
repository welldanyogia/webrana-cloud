'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Server,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrder, useCancelOrder } from '@/hooks/use-orders';
import {
  formatCurrency,
  formatDate,
  getOrderStatusLabel,
} from '@/lib/utils';
import type { OrderStatus } from '@/types';

function formatRam(ramMb: number): string {
  if (ramMb >= 1024) {
    return `${ramMb / 1024} GB`;
  }
  return `${ramMb} MB`;
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

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case 'ACTIVE':
      return <CheckCircle className="h-5 w-5 text-[var(--success)]" />;
    case 'PENDING_PAYMENT':
      return <Clock className="h-5 w-5 text-[var(--warning)]" />;
    case 'PAYMENT_RECEIVED':
    case 'PROVISIONING':
      return <Loader2 className="h-5 w-5 text-[var(--info)] animate-spin" />;
    case 'FAILED':
    case 'CANCELLED':
    case 'EXPIRED':
      return <XCircle className="h-5 w-5 text-[var(--error)]" />;
    default:
      return <AlertCircle className="h-5 w-5 text-[var(--text-muted)]" />;
  }
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} berhasil disalin`);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const cancelOrderMutation = useCancelOrder();

  const handleCancelOrder = () => {
    if (confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
      cancelOrderMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !order) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Pesanan Tidak Ditemukan
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          Pesanan yang Anda cari tidak ditemukan atau telah dihapus.
        </p>
        <Link href="/vps">
          <Button variant="outline">Kembali ke VPS Saya</Button>
        </Link>
      </div>
    );
  }

  const isPendingPayment = order.status === 'PENDING_PAYMENT';
  const isActive = order.status === 'ACTIVE';
  const canCancel = isPendingPayment;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href="/vps"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke VPS Saya
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {getStatusIcon(order.status)}
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {order.orderNumber || `Order #${order.id.slice(0, 8)}`}
            </h1>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            Dibuat pada {formatDate(order.createdAt)}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(order.status)} size="md">
          {getOrderStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Notice for Pending Orders */}
          {isPendingPayment && (
            <Card highlighted>
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--warning-bg)] rounded-lg flex items-center justify-center shrink-0">
                    <CreditCard className="h-6 w-6 text-[var(--warning)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[var(--text-primary)] mb-1">
                      Menunggu Pembayaran
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mb-4">
                      Silakan selesaikan pembayaran untuk memproses pesanan Anda.
                      Pesanan akan dibatalkan otomatis jika tidak dibayar dalam 24 jam.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Link href={`/invoices/${order.invoice?.id || order.id}`}>
                        <Button size="sm">
                          Bayar Sekarang
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      </Link>
                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelOrder}
                          isLoading={cancelOrderMutation.isPending}
                        >
                          Batalkan Pesanan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* VPS Credentials for Active Orders */}
          {isActive && order.vpsInstance && (
            <Card highlighted>
              <CardHeader>
                <CardTitle size="sm">Informasi Akses Server</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="bg-[var(--surface)] rounded-lg p-4 space-y-3">
                  {order.vpsInstance.ipAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">IP Address</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                          {order.vpsInstance.ipAddress}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(order.vpsInstance!.ipAddress!, 'IP Address')
                          }
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">Username</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                        root
                      </code>
                      <button
                        onClick={() => copyToClipboard('root', 'Username')}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {order.vpsInstance.rootPassword && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">Password</span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                          {order.vpsInstance.rootPassword}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(order.vpsInstance!.rootPassword!, 'Password')
                          }
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  💡 Tip: Gunakan SSH untuk terhubung ke server Anda:{' '}
                  <code className="bg-[var(--surface)] px-1 rounded">
                    ssh root@{order.vpsInstance.ipAddress || 'IP_ADDRESS'}
                  </code>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Provisioning Status */}
          {order.status === 'PROVISIONING' && (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-12 w-12 text-[var(--primary)] animate-spin mx-auto mb-4" />
                <h3 className="font-semibold text-[var(--text-primary)] mb-2">
                  Server Sedang Disiapkan
                </h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Proses ini biasanya membutuhkan waktu 2-5 menit. Halaman ini akan diperbarui secara otomatis.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Detail Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Hostname</dt>
                  <dd className="font-mono text-sm text-[var(--text-primary)]">
                    {order.hostname}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-[var(--text-secondary)]">Periode</dt>
                  <dd className="text-sm text-[var(--text-primary)]">
                    {order.duration} {order.durationUnit === 'MONTHLY' ? 'Bulan' : 'Tahun'}
                  </dd>
                </div>
                {order.couponCode && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-[var(--text-secondary)]">Kupon</dt>
                    <dd className="text-sm text-[var(--success)]">{order.couponCode}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Plan & Image Info */}
          {order.plan && (
            <Card>
              <CardHeader>
                <CardTitle size="sm">Spesifikasi VPS</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                    <Cpu className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="font-semibold text-[var(--text-primary)]">
                      {order.plan.cpu} vCPU
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Processor</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                    <Server className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="font-semibold text-[var(--text-primary)]">
                      {formatRam(order.plan.ram)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Memory</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                    <HardDrive className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="font-semibold text-[var(--text-primary)]">
                      {order.plan.ssd} GB
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">SSD Storage</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                    <Wifi className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="font-semibold text-[var(--text-primary)]">
                      {order.plan.bandwidth >= 1000
                        ? `${order.plan.bandwidth / 1000} TB`
                        : `${order.plan.bandwidth} GB`}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Bandwidth</p>
                  </div>
                </div>
                {order.image && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--surface)] rounded-lg flex items-center justify-center">
                        <Server className="h-5 w-5 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {order.image.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {order.image.distribution} {order.image.version}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Payment Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle size="sm">Ringkasan Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {order.plan && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">
                    Paket {order.plan.name}
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(order.totalAmount + (order.discountAmount || 0))}
                  </span>
                </div>
              )}
              {order.discountAmount && order.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--success)]">Diskon</span>
                  <span className="text-[var(--success)]">
                    - {formatCurrency(order.discountAmount)}
                  </span>
                </div>
              )}
              <div className="border-t border-[var(--border)] pt-4 flex justify-between">
                <span className="font-semibold text-[var(--text-primary)]">Total</span>
                <span className="font-bold text-lg text-[var(--primary)]">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>

              {/* Invoice Info */}
              {order.invoice && (
                <div className="bg-[var(--surface)] rounded-lg p-3 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-muted)]">Invoice</span>
                    <span className="font-mono text-[var(--text-primary)]">
                      {order.invoice.invoiceNumber}
                    </span>
                  </div>
                  {order.invoice.paidAt && (
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-[var(--text-muted)]">Dibayar</span>
                      <span className="text-[var(--text-primary)]">
                        {formatDate(order.invoice.paidAt)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
