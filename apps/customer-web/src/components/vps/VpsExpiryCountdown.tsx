'use client';

import { Clock, AlertTriangle, Timer } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';

import { cn } from '@/lib/utils';

interface VpsExpiryCountdownProps {
  expiresAt: string | null;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
  isUrgent: boolean; // < 24 hours
  isWarning: boolean; // < 7 days
}

function calculateTimeRemaining(expiresAt: string | null): TimeRemaining {
  if (!expiresAt) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      isExpired: true,
      isUrgent: false,
      isWarning: false,
    };
  }

  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      total: 0,
      isExpired: true,
      isUrgent: false,
      isWarning: false,
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  const isUrgent = diff < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isWarning = diff < 7 * 24 * 60 * 60 * 1000; // Less than 7 days

  return {
    days,
    hours,
    minutes,
    seconds,
    total: diff,
    isExpired: false,
    isUrgent,
    isWarning,
  };
}

export function VpsExpiryCountdown({
  expiresAt,
  className,
  showIcon = true,
  variant = 'default',
}: VpsExpiryCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(expiresAt)
  );

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const { days, hours, minutes, seconds, isExpired, isUrgent, isWarning } = timeRemaining;

  // Color classes based on urgency
  const colorClasses = useMemo(() => {
    if (isExpired) {
      return {
        text: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        icon: 'text-red-500',
      };
    }
    if (isUrgent) {
      return {
        text: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: 'text-amber-500',
      };
    }
    if (isWarning) {
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/10',
        icon: 'text-amber-400',
      };
    }
    return {
      text: 'text-[var(--text-secondary)]',
      bg: 'bg-[var(--surface)]',
      border: 'border-[var(--border)]',
      icon: 'text-[var(--text-muted)]',
    };
  }, [isExpired, isUrgent, isWarning]);

  if (!expiresAt) {
    return null;
  }

  // Compact variant - single line display
  if (variant === 'compact') {
    if (isExpired) {
      return (
        <span className={cn('text-sm font-medium', colorClasses.text, className)}>
          Kedaluwarsa
        </span>
      );
    }

    return (
      <span className={cn('text-sm font-medium', colorClasses.text, className)}>
        {days > 0 && `${days}h `}
        {hours > 0 && `${hours}j `}
        {days === 0 && `${minutes}m`}
      </span>
    );
  }

  // Detailed variant - countdown boxes
  if (variant === 'detailed') {
    if (isExpired) {
      return (
        <div className={cn('flex items-center gap-2', className)}>
          <AlertTriangle className={cn('h-5 w-5', colorClasses.icon)} />
          <span className={cn('text-sm font-semibold', colorClasses.text)}>
            Masa aktif telah berakhir
          </span>
        </div>
      );
    }

    return (
      <div className={cn('space-y-2', className)}>
        {showIcon && (isUrgent || isWarning) && (
          <div className="flex items-center gap-1.5 text-xs">
            <Timer className={cn('h-3.5 w-3.5', colorClasses.icon)} />
            <span className={colorClasses.text}>
              {isUrgent ? 'Segera berakhir!' : 'Akan berakhir dalam'}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {/* Days */}
          <div className={cn('flex flex-col items-center rounded-lg px-3 py-2', colorClasses.bg)}>
            <span className={cn('text-lg font-bold tabular-nums', colorClasses.text)}>
              {String(days).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              Hari
            </span>
          </div>
          <span className="text-[var(--text-muted)]">:</span>
          {/* Hours */}
          <div className={cn('flex flex-col items-center rounded-lg px-3 py-2', colorClasses.bg)}>
            <span className={cn('text-lg font-bold tabular-nums', colorClasses.text)}>
              {String(hours).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              Jam
            </span>
          </div>
          <span className="text-[var(--text-muted)]">:</span>
          {/* Minutes */}
          <div className={cn('flex flex-col items-center rounded-lg px-3 py-2', colorClasses.bg)}>
            <span className={cn('text-lg font-bold tabular-nums', colorClasses.text)}>
              {String(minutes).padStart(2, '0')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
              Menit
            </span>
          </div>
          {isUrgent && (
            <>
              <span className="text-[var(--text-muted)]">:</span>
              {/* Seconds */}
              <div className={cn('flex flex-col items-center rounded-lg px-3 py-2', colorClasses.bg)}>
                <span className={cn('text-lg font-bold tabular-nums', colorClasses.text)}>
                  {String(seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  Detik
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default variant - inline with icon
  if (isExpired) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <AlertTriangle className={cn('h-4 w-4', colorClasses.icon)} />
        <span className={cn('text-sm font-medium', colorClasses.text)}>Kedaluwarsa</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {showIcon && <Clock className={cn('h-4 w-4', colorClasses.icon)} />}
      <span className={cn('text-sm font-medium tabular-nums', colorClasses.text)}>
        {days > 0 && `${days}h `}
        {hours}j {minutes}m
        {isUrgent && ` ${seconds}d`}
      </span>
    </div>
  );
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(expiresAt));
}
