import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      placeholder,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Base styles
              'block w-full h-11 rounded-lg border bg-[var(--input-bg)] px-4 pr-10',
              'text-[var(--text-primary)] text-sm',
              'appearance-none cursor-pointer',
              // Focus states
              'focus:outline-none focus:border-[var(--primary)]',
              'focus:ring-[3px] focus:ring-[var(--input-focus-ring)]',
              // Transitions
              'transition-all duration-200',
              // Disabled states
              'disabled:bg-[var(--surface)] disabled:text-[var(--text-muted)]',
              'disabled:cursor-not-allowed disabled:opacity-60',
              // Error states
              error
                ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error-bg)]'
                : 'border-[var(--input-border)] hover:border-[var(--border-hover)]',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && (
          <p
            id={`${selectId}-error`}
            className="mt-2 text-sm text-[var(--error)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${selectId}-helper`}
            className="mt-2 text-sm text-[var(--text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
