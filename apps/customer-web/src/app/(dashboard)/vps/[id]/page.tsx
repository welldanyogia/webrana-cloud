'use client';

import {
  ArrowLeft,
  Copy,
  Server,
  Globe,
  Calendar,
  Clock,
  AlertCircle,
  Terminal,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  VpsStatusBadge,
  VpsSpecsDisplay,
  VpsBillingCard,
  VpsPowerControls,
  VpsDangerZone,
  VpsExpiryCountdown,
  VpsConsoleButton,
} from '@/components/vps';
import {
  useVpsDetail,
  useVpsPowerOn,
  useVpsPowerOff,
  useVpsReboot,
  useVpsToggleAutoRenew,
  useVpsManualRenew,
  useVpsDelete,
  useVpsRebuild,
} from '@/hooks/use-vps';
import { formatDate, formatCurrency } from '@/lib/utils';


function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} berhasil disalin`);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
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
  const router = useRouter();
  const { data: vps, isLoading, isError } = useVpsDetail(id);

  // Power mutations
  const powerOn = useVpsPowerOn();
  const powerOff = useVpsPowerOff();
  const reboot = useVpsReboot();

  // Lifecycle mutations
  const toggleAutoRenew = useVpsToggleAutoRenew();
  const manualRenew = useVpsManualRenew();
  const deleteVps = useVpsDelete();
  const rebuildVps = useVpsRebuild();

  const handleOpenConsole = async () => {
    try {
      const { url } = await import('@/services/vps.service').then(m => m.vpsService.getConsoleUrl(id));
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Console dibuka di tab baru');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Gagal membuka console';
      toast.error(message);
    }
  };

  const handleDelete = (vpsId: string) => {
    deleteVps.mutate(vpsId, {
      onSuccess: () => {
        router.push('/vps');
      },
    });
  };

  const handleRebuild = (vpsId: string, imageId: string) => {
    rebuildVps.mutate({ id: vpsId, imageId });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError || !vps) {
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          VPS Tidak Ditemukan
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          VPS yang Anda cari tidak ditemukan atau tidak dapat diakses.
        </p>
        <Link href="/vps">
          <Button variant="outline">Kembali ke Server Saya</Button>
        </Link>
      </div>
    );
  }

  const ipAddress = vps.provisioningTask?.ipv4Public;
  const ipPrivate = vps.provisioningTask?.ipv4Private;
  const region = vps.provisioningTask?.doRegion;
  const dropletStatus = vps.provisioningTask?.dropletStatus;
  const isActive = vps.status === 'ACTIVE' || vps.status === 'EXPIRING_SOON';

  // Get specs
  const specs = {
    vcpu: vps.plan?.vcpu ?? 1,
    memory: vps.plan?.memory ?? 1024,
    disk: vps.plan?.disk ?? 25,
    bandwidth: vps.plan?.bandwidth ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href="/vps"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Server Saya
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          {/* Server Icon */}
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0
            ${isActive 
              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-[0_0_20px_rgba(34,197,94,0.2)]' 
              : 'bg-[var(--surface)]'
            }
          `}>
            <Server className={`h-7 w-7 ${isActive ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} />
          </div>

          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
                {vps.planName}
              </h1>
            </div>
            {ipAddress ? (
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-[var(--text-muted)]">
                  {ipAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(ipAddress, 'IP Address')}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{vps.imageName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <VpsConsoleButton
            orderId={vps.id}
            disabled={!isActive}
            disabledReason={!isActive ? 'Console hanya tersedia saat VPS aktif' : undefined}
          />
          <VpsStatusBadge status={vps.status} size="lg" />
        </div>
      </div>

      {/* Expiry Alert (if expiring soon) */}
      {vps.status === 'EXPIRING_SOON' && vps.expiresAt && (
        <Card highlighted className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">
                  VPS akan segera berakhir!
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Perpanjang sekarang untuk menghindari penangguhan.
                </p>
              </div>
              <VpsExpiryCountdown expiresAt={vps.expiresAt} variant="compact" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {region && (
              <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
                <MapPin className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {region.toUpperCase()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">Region</p>
              </div>
            )}
            {vps.imageName && (
              <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
                <Globe className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1.5" />
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {vps.imageName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">OS</p>
              </div>
            )}
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
              <Calendar className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {formatCurrency(vps.finalPrice)}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {vps.billingPeriod === 'DAILY' ? '/hari' : vps.billingPeriod === 'MONTHLY' ? '/bulan' : '/tahun'}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center">
              <Clock className="h-5 w-5 text-[var(--text-muted)] mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {vps.createdAt ? new Date(vps.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Dibuat</p>
            </div>
          </div>

          {/* Specs */}
          <Card>
            <CardHeader noBorder>
              <CardTitle size="sm">Spesifikasi Server</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <VpsSpecsDisplay
                vcpu={specs.vcpu}
                memory={specs.memory}
                disk={specs.disk}
                bandwidth={specs.bandwidth}
                variant="grid"
              />
            </CardContent>
          </Card>

          {/* Power Controls */}
          <VpsPowerControls
            status={vps.status}
            dropletStatus={dropletStatus}
            onPowerOn={() => powerOn.mutate(id)}
            onPowerOff={() => powerOff.mutate(id)}
            onReboot={() => reboot.mutate(id)}
            onOpenConsole={handleOpenConsole}
            isPowerOnLoading={powerOn.isPending}
            isPowerOffLoading={powerOff.isPending}
            isRebootLoading={reboot.isPending}
          />

          {/* SSH Access */}
          {ipAddress && isActive && (
            <Card>
              <CardHeader>
                <CardTitle size="sm" className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-[var(--primary)]" />
                  Akses SSH
                </CardTitle>
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
                        {ipAddress}
                      </code>
                      <button
                        onClick={() => copyToClipboard(ipAddress, 'IP Address')}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {ipPrivate && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--text-secondary)]">
                        IP Private
                      </span>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-[var(--text-primary)] bg-[var(--card-bg)] px-2 py-1 rounded">
                          {ipPrivate}
                        </code>
                        <button
                          onClick={() => copyToClipboard(ipPrivate, 'IP Private')}
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
                      ssh root@{ipAddress}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(`ssh root@${ipAddress}`, 'Perintah SSH')
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

          {/* Danger Zone */}
          <VpsDangerZone
            vpsId={id}
            planName={vps.planName}
            status={vps.status}
            currentImageId={vps.imageId}
            onDelete={handleDelete}
            onRebuild={handleRebuild}
            isDeleting={deleteVps.isPending}
            isRebuilding={rebuildVps.isPending}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Billing Card */}
          <VpsBillingCard
            finalPrice={vps.finalPrice}
            billingPeriod={vps.billingPeriod}
            expiresAt={vps.expiresAt}
            autoRenew={vps.autoRenew}
            status={vps.status}
            onToggleAutoRenew={() =>
              toggleAutoRenew.mutate({ id, enabled: !vps.autoRenew })
            }
            onManualRenew={() => manualRenew.mutate(id)}
            isToggling={toggleAutoRenew.isPending}
            isRenewing={manualRenew.isPending}
            className="sticky top-6"
          />

          {/* Instance Info Card */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Informasi Instance</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">ID</span>
                  <span className="text-[var(--text-primary)] font-mono text-xs">
                    {vps.id.substring(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Plan</span>
                  <span className="text-[var(--text-primary)] font-medium">
                    {vps.planName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">OS</span>
                  <span className="text-[var(--text-primary)]">
                    {vps.imageName}
                  </span>
                </div>
                {vps.activatedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Diaktifkan</span>
                    <span className="text-[var(--text-primary)]">
                      {formatDate(vps.activatedAt)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Dibuat</span>
                  <span className="text-[var(--text-primary)]">
                    {formatDate(vps.createdAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
