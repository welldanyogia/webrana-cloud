'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Server,
  Cpu,
  HardDrive,
  Globe,
  AlertCircle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  StatusIndicator,
  ActionButton,
  ActionModal,
  PasswordModal,
} from '@/components/vps';
import {
  useInstance,
  useTriggerAction,
  useActionStatus,
  ACTION_LABELS,
} from '@/hooks/use-instances';
import { formatDate } from '@/lib/utils';
import type { InstanceStatus, InstanceActionType } from '@/types';

function formatRam(ramMb: number): string {
  if (ramMb >= 1024) {
    return `${ramMb / 1024} GB`;
  }
  return `${ramMb} MB`;
}

function getStatusBadgeVariant(
  status: InstanceStatus
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'new':
      return 'info';
    case 'off':
      return 'danger';
    case 'archive':
      return 'default';
    default:
      return 'default';
  }
}

function getStatusLabel(status: InstanceStatus): string {
  const labels: Record<InstanceStatus, string> = {
    active: 'Aktif',
    off: 'Mati',
    new: 'Baru',
    archive: 'Arsip',
  };
  return labels[status] || status;
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

export default function VPSDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: instance, isLoading, isError, refetch } = useInstance(id);
  const triggerAction = useTriggerAction();

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    actionType: InstanceActionType | null;
  }>({ isOpen: false, actionType: null });

  const [passwordModal, setPasswordModal] = useState({
    isOpen: false,
    password: null as string | null,
  });

  // Track pending action for status polling
  const [pendingAction, setPendingAction] = useState<{
    actionId: number;
    type: InstanceActionType;
  } | null>(null);

  // Poll action status
  const { data: actionStatus } = useActionStatus(
    id,
    pendingAction?.actionId ?? null,
    { enabled: !!pendingAction }
  );

  // Handle action status changes
  useEffect(() => {
    if (!actionStatus || !pendingAction) return;

    if (actionStatus.status === 'completed') {
      const actionLabel = ACTION_LABELS[pendingAction.type];
      toast.success(`${actionLabel} berhasil!`);

      // Show password modal for reset_password
      if (pendingAction.type === 'reset_password') {
        setPasswordModal({ isOpen: true, password: null });
      }

      setPendingAction(null);
      refetch();
    } else if (actionStatus.status === 'errored') {
      const actionLabel = ACTION_LABELS[pendingAction.type];
      toast.error(`${actionLabel} gagal. Silakan coba lagi.`);
      setPendingAction(null);
    }
  }, [actionStatus, pendingAction, refetch]);

  const handleOpenConfirmModal = (actionType: InstanceActionType) => {
    setConfirmModal({ isOpen: true, actionType });
  };

  const handleCloseConfirmModal = () => {
    setConfirmModal({ isOpen: false, actionType: null });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.actionType || !instance) return;

    try {
      const result = await triggerAction.mutateAsync({
        instanceId: instance.id,
        type: confirmModal.actionType,
      });

      // Start polling for action status
      setPendingAction({
        actionId: result.id,
        type: confirmModal.actionType,
      });

      handleCloseConfirmModal();
    } catch {
      // Error is handled by the mutation
      handleCloseConfirmModal();
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !instance) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          VPS Tidak Ditemukan
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          VPS yang Anda cari tidak ditemukan atau tidak dapat diakses.
        </p>
        <Link href="/vps">
          <Button variant="outline">Kembali ke VPS Saya</Button>
        </Link>
      </div>
    );
  }

  const isActive = instance.status === 'active';
  const isOff = instance.status === 'off';
  const isActionPending = !!pendingAction || triggerAction.isPending;

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
            <StatusIndicator status={instance.status} size="lg" />
            <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
              {instance.hostname}
            </h1>
          </div>
          {instance.ipAddress && (
            <p className="text-sm text-[var(--text-muted)] font-mono">
              {instance.ipAddress}
            </p>
          )}
        </div>
        <Badge variant={getStatusBadgeVariant(instance.status)} size="md">
          {getStatusLabel(instance.status)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Pending Notice */}
          {isActionPending && (
            <Card highlighted>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-[var(--primary)] animate-spin" />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {pendingAction
                        ? `${ACTION_LABELS[pendingAction.type]} sedang diproses...`
                        : 'Mengirim permintaan...'}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      Harap tunggu, proses ini membutuhkan waktu beberapa saat.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Aksi Server</CardTitle>
              <CardDescription>
                Kelola power dan akses server Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-3">
                {isActive && (
                  <>
                    <ActionButton
                      actionType="reboot"
                      onClick={() => handleOpenConfirmModal('reboot')}
                      disabled={isActionPending}
                    />
                    <ActionButton
                      actionType="power_off"
                      onClick={() => handleOpenConfirmModal('power_off')}
                      disabled={isActionPending}
                    />
                    <ActionButton
                      actionType="reset_password"
                      onClick={() => handleOpenConfirmModal('reset_password')}
                      disabled={isActionPending}
                    />
                  </>
                )}
                {isOff && (
                  <ActionButton
                    actionType="power_on"
                    onClick={() => handleOpenConfirmModal('power_on')}
                    disabled={isActionPending}
                  />
                )}
                {!isActive && !isOff && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Aksi tidak tersedia untuk status saat ini.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SSH Access Card */}
          {instance.ipAddress && (
            <Card>
              <CardHeader>
                <CardTitle size="sm">Akses SSH</CardTitle>
                <CardDescription>
                  Hubungkan ke server menggunakan SSH
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="bg-[var(--surface)] rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">
                      IP Address
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                        {instance.ipAddress}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(instance.ipAddress!, 'IP Address')
                        }
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {instance.ipAddressPrivate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">
                        IP Private
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                          {instance.ipAddressPrivate}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              instance.ipAddressPrivate!,
                              'IP Private'
                            )
                          }
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--text-secondary)]">
                      Username
                    </span>
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
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
                    <Terminal className="h-3 w-3" />
                    Perintah SSH
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-3 py-2 rounded">
                      ssh root@{instance.ipAddress}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `ssh root@${instance.ipAddress}`,
                          'Perintah SSH'
                        )
                      }
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specs Card */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Spesifikasi Server</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <Cpu className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="font-semibold text-[var(--text-primary)]">
                    {instance.vcpus || instance.plan.cpu} vCPU
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Processor</p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <Server className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="font-semibold text-[var(--text-primary)]">
                    {formatRam(instance.memory || instance.plan.ram)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Memory</p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <HardDrive className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="font-semibold text-[var(--text-primary)]">
                    {instance.disk || instance.plan.ssd} GB
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">SSD Storage</p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <Globe className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1" />
                  <p className="font-semibold text-[var(--text-primary)]">
                    {instance.region.toUpperCase()}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Region</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Instance Info Card */}
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle size="sm">Informasi Instance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Plan</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {instance.plan.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">OS</span>
                  <span className="text-[var(--text-primary)]">
                    {instance.image.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Distribution</span>
                  <span className="text-[var(--text-primary)] capitalize">
                    {instance.image.distribution}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Region</span>
                  <span className="text-[var(--text-primary)]">
                    {instance.region.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Dibuat</span>
                  <span className="text-[var(--text-primary)]">
                    {formatDate(instance.createdAt)}
                  </span>
                </div>
              </div>

              {/* View Order Link */}
              <div className="pt-4 border-t border-[var(--border)]">
                <Link href={`/order/${instance.orderId}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Lihat Detail Pesanan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.actionType && (
        <ActionModal
          isOpen={confirmModal.isOpen}
          onClose={handleCloseConfirmModal}
          onConfirm={handleConfirmAction}
          actionType={confirmModal.actionType}
          hostname={instance.hostname}
          isLoading={triggerAction.isPending}
        />
      )}

      {/* Password Modal */}
      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, password: null })}
        hostname={instance.hostname}
        password={passwordModal.password}
      />
    </div>
  );
}
