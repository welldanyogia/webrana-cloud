'use client';

import { RefreshCw, Power, PowerOff, Key } from 'lucide-react';
import { forwardRef } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { ACTION_LABELS } from '@/hooks/use-instances';
import { cn } from '@/lib/utils';
import type { InstanceActionType } from '@/types';

interface ActionButtonProps extends Omit<ButtonProps, 'onClick'> {
  actionType: InstanceActionType;
  onClick?: () => void;
  showLabel?: boolean;
}

const ACTION_ICONS: Record<InstanceActionType, React.ReactNode> = {
  reboot: <RefreshCw className="h-4 w-4" />,
  power_on: <Power className="h-4 w-4" />,
  power_off: <PowerOff className="h-4 w-4" />,
  reset_password: <Key className="h-4 w-4" />,
};

const ACTION_VARIANTS: Record<InstanceActionType, ButtonProps['variant']> = {
  reboot: 'outline',
  power_on: 'success',
  power_off: 'danger',
  reset_password: 'outline',
};

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      actionType,
      onClick,
      showLabel = true,
      className,
      isLoading,
      disabled,
      ...props
    },
    ref
  ) => {
    const icon = ACTION_ICONS[actionType];
    const label = ACTION_LABELS[actionType];
    const variant = ACTION_VARIANTS[actionType];

    return (
      <Button
        ref={ref}
        variant={variant}
        size={showLabel ? 'sm' : 'icon'}
        onClick={onClick}
        isLoading={isLoading}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={cn(
          // Add specific styles based on action type
          actionType === 'reboot' && 'hover:text-[var(--warning)]',
          className
        )}
        leftIcon={showLabel ? icon : undefined}
        {...props}
      >
        {showLabel ? label : icon}
      </Button>
    );
  }
);

ActionButton.displayName = 'ActionButton';
