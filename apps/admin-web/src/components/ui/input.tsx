import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends Omit<React.ComponentProps<"input">, "ref"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, leftIcon, rightIcon, required, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
            {label} {required && <span className="text-destructive">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            id={id}
            required={required}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            aria-describedby={
              error ? (id ? `${id}-error` : undefined) : helperText ? (id ? `${id}-helper` : undefined) : undefined
            }
            aria-invalid={!!error}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={id ? `${id}-error` : undefined} role="alert" className="mt-1.5 text-sm text-destructive">
            {error}
          </p>
        ) : helperText ? (
          <p id={id ? `${id}-helper` : undefined} className="mt-1.5 text-sm text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
