import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type BadgeSize = 'sm' | 'md';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Add a dot indicator before text */
  dot?: boolean;
  /** Make badge fully rounded (pill shape) */
  pill?: boolean;
  children: React.ReactNode;
}

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  pill = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]',
    primary: 'bg-[var(--primary-muted)] text-[var(--primary)] border-transparent',
    secondary: 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]',
    success: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
    danger: 'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]',
    info: 'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]',
  };

  const dotColors = {
    default: 'bg-[var(--text-muted)]',
    primary: 'bg-[var(--primary)]',
    secondary: 'bg-[var(--text-secondary)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--error)]',
    info: 'bg-[var(--info)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        'transition-colors duration-150',
        pill ? 'rounded-full' : 'rounded-md',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span 
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[variant]
          )} 
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
