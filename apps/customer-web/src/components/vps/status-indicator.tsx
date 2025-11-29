'use client';

import { cn } from '@/lib/utils';
import type { InstanceStatus } from '@/types';

interface StatusIndicatorProps {
  status: InstanceStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const STATUS_CONFIG: Record<
  InstanceStatus,
  { color: string; label: string; bgColor: string }
> = {
  active: {
    color: 'bg-[var(--success)]',
    bgColor: 'bg-[var(--success-bg)]',
    label: 'Aktif',
  },
  off: {
    color: 'bg-[var(--error)]',
    bgColor: 'bg-[var(--error-bg)]',
    label: 'Mati',
  },
  new: {
    color: 'bg-[var(--warning)]',
    bgColor: 'bg-[var(--warning-bg)]',
    label: 'Baru',
  },
  archive: {
    color: 'bg-[var(--text-muted)]',
    bgColor: 'bg-[var(--surface)]',
    label: 'Arsip',
  },
};

const SIZE_CONFIG = {
  sm: {
    dot: 'w-2 h-2',
    text: 'text-xs',
    container: 'gap-1.5',
  },
  md: {
    dot: 'w-2.5 h-2.5',
    text: 'text-sm',
    container: 'gap-2',
  },
  lg: {
    dot: 'w-3 h-3',
    text: 'text-base',
    container: 'gap-2.5',
  },
};

export function StatusIndicator({
  status,
  showLabel = false,
  size = 'md',
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn('inline-flex items-center', sizeConfig.container)}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <span
        className={cn(
          'rounded-full flex-shrink-0',
          sizeConfig.dot,
          config.color,
          // Pulse animation for active status
          status === 'active' && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      {showLabel && (
        <span
          className={cn(
            'font-medium text-[var(--text-secondary)]',
            sizeConfig.text
          )}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
