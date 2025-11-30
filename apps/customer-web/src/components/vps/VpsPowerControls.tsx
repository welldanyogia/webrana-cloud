'use client';

import { Power, RotateCcw, PowerOff, Terminal, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VpsOrderStatus } from '@/services/vps.service';

interface VpsPowerControlsProps {
  status: VpsOrderStatus;
  dropletStatus?: string | null;
  onPowerOn?: () => void;
  onPowerOff?: () => void;
  onReboot?: () => void;
  onOpenConsole?: () => void;
  isPowerOnLoading?: boolean;
  isPowerOffLoading?: boolean;
  isRebootLoading?: boolean;
  className?: string;
}

export function VpsPowerControls({
  status,
  dropletStatus,
  onPowerOn,
  onPowerOff,
  onReboot,
  onOpenConsole,
  isPowerOnLoading,
  isPowerOffLoading,
  isRebootLoading,
  className,
}: VpsPowerControlsProps) {
  // Determine if VPS is running based on status
  const isActive = status === 'ACTIVE' || status === 'EXPIRING_SOON';
  const isVpsRunning = isActive && dropletStatus === 'active';
  const isVpsStopped = isActive && dropletStatus === 'off';
  const canPerformActions = isActive;
  const isAnyLoading = isPowerOnLoading || isPowerOffLoading || isRebootLoading;

  // Status indicator
  const getStatusIndicator = () => {
    if (isPowerOnLoading) {
      return {
        color: 'bg-blue-500',
        text: 'Menyalakan...',
        pulse: true,
      };
    }
    if (isPowerOffLoading) {
      return {
        color: 'bg-amber-500',
        text: 'Mematikan...',
        pulse: true,
      };
    }
    if (isRebootLoading) {
      return {
        color: 'bg-blue-500',
        text: 'Restarting...',
        pulse: true,
      };
    }
    if (isVpsRunning) {
      return {
        color: 'bg-emerald-500',
        text: 'Running',
        pulse: false,
      };
    }
    if (isVpsStopped) {
      return {
        color: 'bg-red-500',
        text: 'Stopped',
        pulse: false,
      };
    }
    return {
      color: 'bg-slate-500',
      text: 'Unknown',
      pulse: false,
    };
  };

  const statusIndicator = getStatusIndicator();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle size="sm" className="flex items-center gap-2">
              <Power className="h-4 w-4 text-[var(--primary)]" />
              Kontrol Server
            </CardTitle>
            <CardDescription>Kelola power dan akses server</CardDescription>
          </div>
          {/* Status Indicator */}
          {canPerformActions && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  statusIndicator.color,
                  statusIndicator.pulse && 'animate-pulse'
                )}
              />
              <span className="text-sm text-[var(--text-secondary)]">
                {statusIndicator.text}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Not Active State */}
        {!canPerformActions && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-3">
              <Power className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Kontrol server tidak tersedia untuk status saat ini.
            </p>
          </div>
        )}

        {/* Power Controls Grid */}
        {canPerformActions && (
          <div className="space-y-4">
            {/* Power Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Power On */}
              {isVpsStopped && (
                <Button
                  variant="success"
                  onClick={onPowerOn}
                  disabled={isAnyLoading}
                  className="flex-col h-auto py-4 gap-2"
                >
                  {isPowerOnLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Power className="h-5 w-5" />
                  )}
                  <span className="text-xs">Power On</span>
                </Button>
              )}

              {/* Power Off */}
              {isVpsRunning && (
                <Button
                  variant="danger"
                  onClick={onPowerOff}
                  disabled={isAnyLoading}
                  className="flex-col h-auto py-4 gap-2"
                >
                  {isPowerOffLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <PowerOff className="h-5 w-5" />
                  )}
                  <span className="text-xs">Power Off</span>
                </Button>
              )}

              {/* Reboot */}
              {isVpsRunning && (
                <Button
                  variant="warning"
                  onClick={onReboot}
                  disabled={isAnyLoading}
                  className="flex-col h-auto py-4 gap-2"
                >
                  {isRebootLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                  <span className="text-xs">Reboot</span>
                </Button>
              )}

              {/* Console */}
              {isVpsRunning && onOpenConsole && (
                <Button
                  variant="outline"
                  onClick={onOpenConsole}
                  disabled={isAnyLoading}
                  className="flex-col h-auto py-4 gap-2"
                >
                  <Terminal className="h-5 w-5" />
                  <span className="text-xs">Console</span>
                </Button>
              )}
            </div>

            {/* Warning Messages */}
            {isPowerOffLoading && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-amber-400">
                  ⚠️ Server sedang dimatikan. Proses ini membutuhkan beberapa saat.
                </p>
              </div>
            )}

            {isRebootLoading && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-400">
                  🔄 Server sedang di-restart. Koneksi mungkin terputus sementara.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
