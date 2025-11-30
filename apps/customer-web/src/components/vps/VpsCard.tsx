'use client';

import Link from 'next/link';
import { Server, Copy, ExternalLink, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VpsStatusBadge } from './VpsStatusBadge';
import { VpsSpecsDisplay } from './VpsSpecsDisplay';
import { VpsExpiryCountdown } from './VpsExpiryCountdown';
import { VpsConsoleButton } from './VpsConsoleButton';
import { cn } from '@/lib/utils';
import type { VpsOrder, VpsOrderStatus } from '@/services/vps.service';

interface VpsCardProps {
  vps: VpsOrder;
  className?: string;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.success('IP address disalin');
}

// Get card glow effect based on status
function getStatusGlow(status: VpsOrderStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]';
    case 'PROVISIONING':
    case 'PROCESSING':
      return 'hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]';
    case 'EXPIRING_SOON':
    case 'EXPIRED':
      return 'hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]';
    case 'SUSPENDED':
    case 'TERMINATED':
    case 'FAILED':
      return 'hover:shadow-[0_0_30px_rgba(239,68,68,0.15)]';
    default:
      return '';
  }
}

export function VpsCard({ vps, className }: VpsCardProps) {
  const ipAddress = vps.provisioningTask?.ipv4Public;
  const isActive = vps.status === 'ACTIVE' || vps.status === 'EXPIRING_SOON';
  const showExpiryCountdown =
    vps.expiresAt &&
    ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED'].includes(vps.status);

  // Calculate specs from plan or provisioning task
  const specs = {
    vcpu: vps.plan?.vcpu ?? 1,
    memory: vps.plan?.memory ?? 1024,
    disk: vps.plan?.disk ?? 25,
    bandwidth: vps.plan?.bandwidth ?? 0,
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:border-[var(--primary)]/30',
        getStatusGlow(vps.status),
        className
      )}
    >
      {/* Status Gradient Accent */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1',
          vps.status === 'ACTIVE' && 'bg-gradient-to-r from-emerald-500 to-emerald-400',
          vps.status === 'EXPIRING_SOON' && 'bg-gradient-to-r from-amber-500 to-amber-400',
          vps.status === 'PROVISIONING' && 'bg-gradient-to-r from-blue-500 to-blue-400',
          vps.status === 'PROCESSING' && 'bg-gradient-to-r from-blue-500 to-blue-400',
          vps.status === 'EXPIRED' && 'bg-gradient-to-r from-orange-500 to-orange-400',
          vps.status === 'SUSPENDED' && 'bg-gradient-to-r from-orange-500 to-orange-400',
          vps.status === 'TERMINATED' && 'bg-gradient-to-r from-red-500 to-red-400',
          vps.status === 'FAILED' && 'bg-gradient-to-r from-red-600 to-red-500',
          (vps.status === 'PENDING' || vps.status === 'CANCELED') && 'bg-gradient-to-r from-slate-500 to-slate-400'
        )}
      />

      <CardContent className="p-5 pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            {/* Server Icon */}
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105',
                isActive
                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5'
                  : 'bg-[var(--surface)]'
              )}
            >
              <Server
                className={cn(
                  'h-6 w-6',
                  isActive ? 'text-emerald-500' : 'text-[var(--text-muted)]'
                )}
              />
            </div>

            <div>
              <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                {vps.planName}
              </h3>
              {vps.imageName && (
                <p className="text-xs text-[var(--text-muted)]">{vps.imageName}</p>
              )}
            </div>
          </div>

          <VpsStatusBadge status={vps.status} size="sm" />
        </div>

        {/* IP Address */}
        {ipAddress ? (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <code className="flex-1 font-mono text-sm text-[var(--text-primary)]">
              {ipAddress}
            </code>
            <button
              onClick={(e) => {
                e.preventDefault();
                copyToClipboard(ipAddress);
              }}
              className="p-1.5 rounded hover:bg-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Copy IP"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            {vps.status === 'PROVISIONING' || vps.status === 'PROCESSING' ? (
              <>
                <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                <span className="text-sm text-[var(--text-muted)]">
                  Sedang dibuat...
                </span>
              </>
            ) : (
              <span className="text-sm text-[var(--text-muted)]">
                IP tidak tersedia
              </span>
            )}
          </div>
        )}

        {/* Specs */}
        <VpsSpecsDisplay
          vcpu={specs.vcpu}
          memory={specs.memory}
          disk={specs.disk}
          bandwidth={specs.bandwidth}
          variant="compact"
          className="mb-4"
        />

        {/* Expiry Countdown */}
        {showExpiryCountdown && (
          <div className="mb-4 py-2 px-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Sisa Waktu:</span>
              <VpsExpiryCountdown expiresAt={vps.expiresAt} variant="compact" />
            </div>
          </div>
        )}

        {/* Auto-Renew Indicator */}
        {isActive && (
          <div className="flex items-center gap-1.5 mb-4">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                vps.autoRenew ? 'bg-emerald-500' : 'bg-slate-500'
              )}
            />
            <span className="text-xs text-[var(--text-muted)]">
              Auto-renew {vps.autoRenew ? 'aktif' : 'nonaktif'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <Link href={`/vps/${vps.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full group/btn">
              <Settings className="h-4 w-4 mr-1.5 group-hover/btn:rotate-45 transition-transform" />
              Kelola
            </Button>
          </Link>
          {isActive && (
            <VpsConsoleButton
              orderId={vps.id}
              disabled={!isActive}
              disabledReason={!isActive ? 'Console hanya tersedia saat VPS aktif' : undefined}
              variant="ghost"
              size="icon"
            />
          )}
          {ipAddress && (
            <Link href={`/vps/${vps.id}`}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
