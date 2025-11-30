'use client';

import { cn } from '@/lib/utils';

interface CapacityBarProps {
  used: number;
  limit: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Visual capacity indicator showing used vs total capacity
 * Changes color based on utilization percentage
 */
export function CapacityBar({
  used,
  limit,
  showLabel = true,
  size = 'md',
  className,
}: CapacityBarProps) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const getColor = () => {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getTextColor = () => {
    if (percent >= 90) return 'text-red-600';
    if (percent >= 70) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  return (
    <div className={cn('space-y-1', className)}>
      <div
        className={cn(
          'bg-[var(--hover-bg)] rounded-full overflow-hidden',
          heightClass
        )}
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`Capacity: ${used} of ${limit} (${percent.toFixed(0)}%)`}
      >
        <div
          className={cn('h-full transition-all duration-300', getColor())}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[var(--text-muted)]">
          <span className={cn('font-medium', getTextColor())}>
            {used}
          </span>
          <span className="mx-0.5">/</span>
          <span>{limit}</span>
          <span className="ml-1">({percent.toFixed(0)}%)</span>
        </p>
      )}
    </div>
  );
}
