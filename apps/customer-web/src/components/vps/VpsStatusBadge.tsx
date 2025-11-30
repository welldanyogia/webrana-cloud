'use client';

import { cn } from '@/lib/utils';
import type { VpsOrderStatus } from '@/services/vps.service';

interface VpsStatusBadgeProps {
  status: VpsOrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  glow?: string;
  pulse?: boolean;
}

const STATUS_CONFIG: Record<VpsOrderStatus, StatusConfig> = {
  PENDING: {
    label: 'Menunggu',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
    pulse: true,
  },
  PROCESSING: {
    label: 'Diproses',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]',
    pulse: true,
  },
  PROVISIONING: {
    label: 'Provisioning',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-500',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.4)]',
    pulse: true,
  },
  ACTIVE: {
    label: 'Aktif',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-500',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.3)]',
  },
  EXPIRING_SOON: {
    label: 'Segera Berakhir',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    dotColor: 'bg-amber-500',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    pulse: true,
  },
  EXPIRED: {
    label: 'Kedaluwarsa',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    pulse: true,
  },
  SUSPENDED: {
    label: 'Ditangguhkan',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
  },
  TERMINATED: {
    label: 'Dihentikan',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
  },
  FAILED: {
    label: 'Gagal',
    bgColor: 'bg-red-600/10',
    textColor: 'text-red-500',
    dotColor: 'bg-red-600',
  },
  CANCELED: {
    label: 'Dibatalkan',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-500',
  },
};

const SIZE_CLASSES = {
  sm: {
    badge: 'px-2 py-0.5 text-[10px]',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    badge: 'px-2.5 py-1 text-xs',
    dot: 'w-2 h-2',
  },
  lg: {
    badge: 'px-3 py-1.5 text-sm',
    dot: 'w-2.5 h-2.5',
  },
};

export function VpsStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: VpsStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        config.bgColor,
        config.textColor,
        config.glow,
        sizeClass.badge,
        className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {showIcon && (
        <span
          className={cn(
            'rounded-full flex-shrink-0',
            sizeClass.dot,
            config.dotColor,
            config.pulse && 'animate-pulse'
          )}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </div>
  );
}

/**
 * Get status configuration (useful for other components)
 */
export function getVpsStatusConfig(status: VpsOrderStatus): StatusConfig {
  return STATUS_CONFIG[status];
}

/**
 * Get status label in Indonesian
 */
export function getVpsStatusLabel(status: VpsOrderStatus): string {
  return STATUS_CONFIG[status].label;
}
