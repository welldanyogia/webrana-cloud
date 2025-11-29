import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Enable hover effects */
  hover?: boolean;
  /** Add subtle padding */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Highlight/featured card */
  highlighted?: boolean;
  /** Make card interactive with glow on hover */
  glow?: boolean;
}

export function Card({ 
  className, 
  children, 
  hover = false, 
  padding = 'none',
  highlighted = false,
  glow = false,
  ...props 
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        // Base styles
        'bg-[var(--card-bg)] rounded-xl border',
        // Shadow
        'shadow-[var(--card-shadow)]',
        // Border color based on highlighted state
        highlighted 
          ? 'border-[var(--primary)]/50 ring-1 ring-[var(--primary-muted)]' 
          : 'border-[var(--border)]',
        // Hover effects
        hover && 'transition-all duration-200 ease-out cursor-pointer hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)]',
        hover && highlighted && 'hover:border-[var(--primary)] hover:ring-2',
        // Glow effect on hover
        glow && 'transition-all duration-200 hover:shadow-[var(--glow-primary)]',
        // Padding
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Remove bottom border */
  noBorder?: boolean;
}

export function CardHeader({ className, children, noBorder = false, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4',
        !noBorder && 'border-b border-[var(--border)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  /** Smaller title size */
  size?: 'sm' | 'md' | 'lg';
}

export function CardTitle({ className, children, size = 'md', ...props }: CardTitleProps) {
  const sizeClasses = {
    sm: 'text-base font-medium',
    md: 'text-lg font-semibold',
    lg: 'text-xl font-semibold',
  };

  return (
    <h3
      className={cn(
        'text-[var(--text-primary)] tracking-tight',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function CardDescription({
  className,
  children,
  ...props
}: CardDescriptionProps) {
  return (
    <p 
      className={cn(
        'text-sm text-[var(--text-secondary)] mt-1 leading-relaxed', 
        className
      )} 
      {...props}
    >
      {children}
    </p>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Remove default padding */
  noPadding?: boolean;
}

export function CardContent({
  className,
  children,
  noPadding = false,
  ...props
}: CardContentProps) {
  return (
    <div 
      className={cn(
        !noPadding && 'px-6 py-5', 
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Align items */
  align?: 'start' | 'center' | 'end' | 'between';
}

export function CardFooter({ className, children, align = 'start', ...props }: CardFooterProps) {
  const alignClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-[var(--border)] bg-[var(--surface)]/50 rounded-b-xl',
        'flex items-center gap-3',
        alignClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
