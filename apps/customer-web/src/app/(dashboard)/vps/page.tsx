'use client';

import Link from 'next/link';
import {
  Server,
  Plus,
  ExternalLink,
  AlertCircle,
  Cpu,
  HardDrive,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusIndicator } from '@/components/vps';
import { useInstances } from '@/hooks/use-instances';
import { formatRelativeTime } from '@/lib/utils';
import type { InstanceStatus } from '@/types';

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
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
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

function formatRam(ramMb: number): string {
  if (ramMb >= 1024) {
    return `${ramMb / 1024} GB`;
  }
  return `${ramMb} MB`;
}

export default function VPSPage() {
  const { data: instancesResponse, isLoading, isError, refetch } = useInstances({
    limit: 50,
  });

  const instances = instancesResponse?.data ?? [];

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
      {!isLoading && !isError && instances.length > 0 && (
        <div className="space-y-4">
          {instances.map((instance) => (
            <Card key={instance.id} hover>
              <CardContent className="p-0">
                <Link href={`/vps/${instance.id}`}>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-4">
                    {/* Instance Info */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-[var(--primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <Server className="h-6 w-6 text-[var(--primary)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold text-[var(--text-primary)]">
                            {instance.hostname}
                          </h3>
                          <Badge
                            variant={getStatusBadgeVariant(instance.status)}
                            dot
                          >
                            {getStatusLabel(instance.status)}
                          </Badge>
                        </div>
                        {instance.ipAddress && (
                          <p className="text-sm text-[var(--text-muted)] font-mono mb-1">
                            {instance.ipAddress}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {instance.plan.cpu} vCPU
                          </span>
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {formatRam(instance.plan.ram)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {instance.plan.ssd} GB
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {instance.region.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {instance.image.name} • Dibuat {formatRelativeTime(instance.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusIndicator status={instance.status} />
                      <Button variant="outline" size="sm">
                        Kelola
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && instances.length === 0 && (
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
