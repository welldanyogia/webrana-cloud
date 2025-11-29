import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-[var(--card-bg)] rounded-xl border border-[var(--border)]',
        'p-5 shadow-[var(--card-shadow)]',
        'transition-all duration-200',
        'hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide">
            {title}
          </p>
          <p className="text-2xl font-semibold text-[var(--text-primary)] mt-2 tracking-tight">
            {value}
          </p>
          {description && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5 truncate">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-3">
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
                  trend.isPositive
                    ? 'bg-[var(--success-bg)] text-[var(--success)]'
                    : 'bg-[var(--error-bg)] text-[var(--error)]'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend.value)}%
              </div>
              <span className="text-xs text-[var(--text-muted)]">vs kemarin</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="shrink-0 p-2.5 bg-[var(--primary-muted)] rounded-lg">
            <Icon className="h-5 w-5 text-[var(--primary)]" />
          </div>
        )}
      </div>
    </div>
  );
}
