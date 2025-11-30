'use client';

import { Calendar, RefreshCw, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VpsExpiryCountdown, formatExpiryDate } from './VpsExpiryCountdown';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { BillingPeriod, VpsOrderStatus } from '@/services/vps.service';

interface VpsBillingCardProps {
  finalPrice: number;
  billingPeriod: BillingPeriod;
  expiresAt: string | null;
  autoRenew: boolean;
  status: VpsOrderStatus;
  onToggleAutoRenew?: () => void;
  onManualRenew?: () => void;
  isToggling?: boolean;
  isRenewing?: boolean;
  className?: string;
}

const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  DAILY: 'Harian',
  MONTHLY: 'Bulanan',
  YEARLY: 'Tahunan',
};

function getBillingPeriodUnit(period: BillingPeriod): string {
  switch (period) {
    case 'DAILY':
      return 'hari';
    case 'MONTHLY':
      return 'bulan';
    case 'YEARLY':
      return 'tahun';
  }
}

export function VpsBillingCard({
  finalPrice,
  billingPeriod,
  expiresAt,
  autoRenew,
  status,
  onToggleAutoRenew,
  onManualRenew,
  isToggling,
  isRenewing,
  className,
}: VpsBillingCardProps) {
  const canRenew = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'SUSPENDED'].includes(status);
  const canToggleAutoRenew = ['ACTIVE', 'EXPIRING_SOON'].includes(status);
  const isExpired = ['EXPIRED', 'SUSPENDED', 'TERMINATED'].includes(status);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle size="sm" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[var(--primary)]" />
          Informasi Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Expiry Countdown - Prominent */}
        {expiresAt && canRenew && (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4">
            <p className="text-xs text-[var(--text-muted)] mb-2">Sisa Waktu Aktif</p>
            <VpsExpiryCountdown expiresAt={expiresAt} variant="detailed" />
          </div>
        )}

        {/* Billing Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Periode
            </span>
            <span className="font-medium text-[var(--text-primary)]">
              {BILLING_PERIOD_LABELS[billingPeriod]}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-[var(--text-secondary)]">Harga</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {formatCurrency(finalPrice)}/{getBillingPeriodUnit(billingPeriod)}
            </span>
          </div>

          {expiresAt && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--text-secondary)]">
                {isExpired ? 'Kedaluwarsa pada' : 'Berakhir pada'}
              </span>
              <span
                className={cn(
                  'text-[var(--text-primary)]',
                  isExpired && 'text-red-500'
                )}
              >
                {formatExpiryDate(expiresAt)}
              </span>
            </div>
          )}
        </div>

        {/* Auto-Renew Toggle */}
        {canToggleAutoRenew && (
          <div
            className={cn(
              'flex items-center justify-between rounded-xl p-3 transition-colors',
              autoRenew
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-[var(--surface)] border border-[var(--border)]'
            )}
          >
            <div className="flex items-center gap-2">
              {autoRenew ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-[var(--text-muted)]" />
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Auto-Renewal</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {autoRenew
                    ? 'Akan diperpanjang otomatis'
                    : 'Tidak akan diperpanjang otomatis'}
                </p>
              </div>
            </div>
            <button
              onClick={onToggleAutoRenew}
              disabled={isToggling}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50',
                autoRenew ? 'bg-emerald-500' : 'bg-[var(--border)]'
              )}
              role="switch"
              aria-checked={autoRenew}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  autoRenew ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        )}

        {/* Manual Renew Button */}
        {canRenew && onManualRenew && (
          <Button
            onClick={onManualRenew}
            isLoading={isRenewing}
            className="w-full"
            variant={isExpired ? 'primary' : 'outline'}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            {isExpired ? 'Perpanjang Sekarang' : 'Perpanjang Manual'}
          </Button>
        )}

        {/* Info text for expired */}
        {isExpired && !autoRenew && (
          <p className="text-xs text-amber-500 text-center">
            💡 Aktifkan auto-renewal untuk menghindari penangguhan VPS
          </p>
        )}
      </CardContent>
    </Card>
  );
}
