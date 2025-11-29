import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Adds a subtle visual indicator that this field is required */
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            {label}
            {required && (
              <span className="text-[var(--error)] ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            required={required}
            className={cn(
              // Base styles
              'block w-full h-11 rounded-lg border bg-[var(--input-bg)] px-4',
              'text-[var(--text-primary)] text-sm',
              'placeholder:text-[var(--text-muted)]',
              // Focus states - professional ring effect
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
              // Icon padding adjustments
              leftIcon ? 'pl-11' : '',
              rightIcon ? 'pr-11' : '',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-2 text-sm text-[var(--error)] flex items-center gap-1.5"
            role="alert"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="mt-2 text-sm text-[var(--text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
