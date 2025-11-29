import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      // Base layout
      'inline-flex items-center justify-center gap-2 font-medium',
      // Border radius - slightly more rounded for modern look
      'rounded-lg',
      // Transitions - smooth and professional
      'transition-all duration-200 ease-out',
      // Focus states - accessible ring
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
      // Disabled states
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
      // Active state feedback - subtle press effect
      'active:scale-[0.98]',
      // Cursor
      'cursor-pointer'
    );

    const variants = {
      primary: cn(
        'bg-[var(--primary)] text-white',
        'hover:bg-[var(--primary-hover)]',
        'focus-visible:ring-[var(--primary)]',
        // Enhanced shadow for depth
        'shadow-[0_1px_2px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)]',
        'hover:shadow-[0_4px_12px_var(--primary-glow)]'
      ),
      secondary: cn(
        'bg-[var(--surface-elevated)] text-[var(--text-primary)]',
        'border border-[var(--border)]',
        'hover:bg-[var(--hover-bg)] hover:border-[var(--border-hover)]',
        'focus-visible:ring-[var(--primary)]',
        'shadow-sm'
      ),
      outline: cn(
        'border border-[var(--border)] bg-transparent text-[var(--text-primary)]',
        'hover:bg-[var(--hover-bg)] hover:border-[var(--border-hover)]',
        'focus-visible:ring-[var(--primary)]'
      ),
      ghost: cn(
        'bg-transparent text-[var(--text-secondary)]',
        'hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]',
        'focus-visible:ring-[var(--text-muted)]'
      ),
      danger: cn(
        'bg-[var(--error)] text-white',
        'hover:bg-[var(--error)]/90',
        'focus-visible:ring-[var(--error)]',
        'shadow-sm hover:shadow-md'
      ),
      success: cn(
        'bg-[var(--success)] text-white',
        'hover:bg-[var(--success)]/90',
        'focus-visible:ring-[var(--success)]',
        'shadow-sm hover:shadow-md'
      ),
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs font-medium',
      md: 'h-10 px-4 text-sm font-medium',
      lg: 'h-11 px-5 text-sm font-medium',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {!isLoading && leftIcon && (
          <span className="shrink-0 -ml-0.5" aria-hidden="true">{leftIcon}</span>
        )}
        {children && <span className={isLoading ? 'opacity-0' : ''}>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0 -mr-0.5" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
