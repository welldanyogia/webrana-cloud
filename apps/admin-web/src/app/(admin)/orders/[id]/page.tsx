'use client';

import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ConfirmModal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminOrderDetail, useUpdatePaymentStatus } from '@/hooks/use-admin-orders';
import {
  formatCurrency,
  formatDateTime,
  getOrderStatusLabel,
  getOrderStatusVariant,
} from '@/lib/utils';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const { data: order, isLoading } = useAdminOrderDetail(orderId);
  const updatePaymentStatus = useUpdatePaymentStatus();

  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [showMarkFailedModal, setShowMarkFailedModal] = useState(false);

  const handleMarkAsPaid = () => {
    updatePaymentStatus.mutate(
      { orderId, data: { status: 'PAID' } },
      {
        onSuccess: () => {
          setShowMarkPaidModal(false);
        },
      }
    );
  };

  const handleMarkAsFailed = () => {
    updatePaymentStatus.mutate(
      { orderId, data: { status: 'FAILED', reason: 'Admin override - pembayaran gagal' } },
      {
        onSuccess: () => {
          setShowMarkFailedModal(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-primary)] font-medium mb-2">
          Pesanan Tidak Ditemukan
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Pesanan dengan ID ini tidak ada
        </p>
        <Link href="/orders">
          <Button variant="outline">Kembali ke Daftar Pesanan</Button>
        </Link>
      </div>
    );
  }

  const canUpdatePayment = order.status === 'PENDING_PAYMENT';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              Dibuat {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <Badge variant={getOrderStatusVariant(order.status)} size="md">
          {getOrderStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Plan</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {order.plan?.name || order.planId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">OS Image</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {order.image?.name || order.imageId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Durasi</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {order.duration} bulan
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Hostname</p>
                    <p className="font-medium text-[var(--text-primary)]">
                      {order.hostname || '-'}
                    </p>
                  </div>
                </div>

                {order.plan && (
                  <div className="border-t border-[var(--border)] pt-4 mt-4">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Spesifikasi</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{order.plan.cpu} vCPU</Badge>
                      <Badge variant="secondary">{order.plan.ram} GB RAM</Badge>
                      <Badge variant="secondary">{order.plan.ssd} GB SSD</Badge>
                      <Badge variant="secondary">{order.plan.bandwidth} TB BW</Badge>
                    </div>
                  </div>
                )}

                <div className="border-t border-[var(--border)] pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <span className="text-[var(--primary)]">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                  {order.couponCode && (
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Kupon: {order.couponCode}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provisioning Task */}
          {order.provisioningTask && (
            <Card>
              <CardHeader>
                <CardTitle>Detail Provisioning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-muted)]">Status</span>
                    <Badge
                      variant={
                        order.provisioningTask.status === 'COMPLETED'
                          ? 'success'
                          : order.provisioningTask.status === 'FAILED'
                          ? 'danger'
                          : 'info'
                      }
                    >
                      {order.provisioningTask.status}
                    </Badge>
                  </div>
                  {order.provisioningTask.dropletId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Droplet ID</span>
                      <span className="text-sm font-mono text-[var(--text-primary)]">
                        {order.provisioningTask.dropletId}
                      </span>
                    </div>
                  )}
                  {order.provisioningTask.dropletIp && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">IP Address</span>
                      <span className="text-sm font-mono text-[var(--text-primary)]">
                        {order.provisioningTask.dropletIp}
                      </span>
                    </div>
                  )}
                  {order.provisioningTask.dropletRegion && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--text-muted)]">Region</span>
                      <span className="text-sm text-[var(--text-primary)]">
                        {order.provisioningTask.dropletRegion}
                      </span>
                    </div>
                  )}
                  {order.provisioningTask.errorMessage && (
                    <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg p-3">
                      <p className="text-sm text-[var(--error)]">
                        {order.provisioningTask.errorMessage}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.statusHistory.map((history, index) => (
                    <div
                      key={history.id}
                      className="flex items-start gap-3 relative"
                    >
                      {index < order.statusHistory!.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-[var(--border)]" />
                      )}
                      <div className="w-6 h-6 rounded-full bg-[var(--primary-muted)] flex items-center justify-center shrink-0">
                        <Clock className="h-3 w-3 text-[var(--primary)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={getOrderStatusVariant(history.previousStatus)} size="sm">
                            {getOrderStatusLabel(history.previousStatus)}
                          </Badge>
                          <span className="text-[var(--text-muted)]">→</span>
                          <Badge variant={getOrderStatusVariant(history.newStatus)} size="sm">
                            {getOrderStatusLabel(history.newStatus)}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {formatDateTime(history.createdAt)}
                          {history.changedBy && ` oleh ${history.changedBy}`}
                        </p>
                        {history.reason && (
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            {history.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Informasi Pelanggan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary-muted)] flex items-center justify-center">
                    <User className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {order.userName || 'User'}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {order.userEmail || 'Unknown email'}
                    </p>
                  </div>
                </div>
                <Link href={`/users/${order.userId}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Lihat Detail Pengguna
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Informasi Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--success-bg)] flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-[var(--success)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {order.paidAt ? `Dibayar ${formatDateTime(order.paidAt)}` : 'Belum dibayar'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Override Actions */}
          {canUpdatePayment && (
            <Card>
              <CardHeader>
                <CardTitle size="sm">Aksi Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    Override status pembayaran untuk pesanan ini.
                  </p>
                  <Button
                    variant="success"
                    className="w-full"
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => setShowMarkPaidModal(true)}
                  >
                    Tandai Sudah Dibayar
                  </Button>
                  <Button
                    variant="danger"
                    className="w-full"
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => setShowMarkFailedModal(true)}
                  >
                    Tandai Gagal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Info Lainnya</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">Dibuat:</span>
                  <span className="text-[var(--text-primary)]">
                    {formatDateTime(order.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-[var(--text-muted)]">Order ID:</span>
                  <span className="text-[var(--text-primary)] font-mono text-xs">
                    {order.id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mark as Paid Modal */}
      <ConfirmModal
        isOpen={showMarkPaidModal}
        onClose={() => setShowMarkPaidModal(false)}
        onConfirm={handleMarkAsPaid}
        title="Konfirmasi Pembayaran"
        description="Apakah Anda yakin ingin menandai pesanan ini sebagai sudah dibayar? Tindakan ini akan memulai proses provisioning VPS."
        confirmText="Ya, Tandai Dibayar"
        variant="success"
        isLoading={updatePaymentStatus.isPending}
      />

      {/* Mark as Failed Modal */}
      <ConfirmModal
        isOpen={showMarkFailedModal}
        onClose={() => setShowMarkFailedModal(false)}
        onConfirm={handleMarkAsFailed}
        title="Konfirmasi Pembayaran Gagal"
        description="Apakah Anda yakin ingin menandai pesanan ini sebagai gagal? Pesanan akan dibatalkan dan tidak dapat dipulihkan."
        confirmText="Ya, Tandai Gagal"
        variant="danger"
        isLoading={updatePaymentStatus.isPending}
      />
    </div>
  );
}
