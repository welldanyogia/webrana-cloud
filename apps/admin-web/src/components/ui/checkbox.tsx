import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="flex flex-col">
        <div className="flex items-start">
          <div className="relative flex items-center">
            <input
              ref={ref}
              id={inputId}
              type="checkbox"
              className={cn(
                'peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded border bg-[var(--input-bg)]',
                'checked:border-[var(--primary)] checked:bg-[var(--primary)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'transition-colors duration-200',
                error ? 'border-[var(--error)]' : 'border-[var(--input-border)]',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              {...props}
            />
            <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none left-[3px] top-[3px]" />
          </div>
          {label && (
            <label
              htmlFor={inputId}
              className="ml-3 text-sm text-[var(--text-secondary)] cursor-pointer select-none leading-relaxed"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[var(--error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
