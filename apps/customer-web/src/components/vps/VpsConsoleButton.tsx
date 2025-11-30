'use client';

import { useState } from 'react';
import { Terminal, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { vpsService } from '@/services/vps.service';

interface VpsConsoleButtonProps {
  orderId: string;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function VpsConsoleButton({
  orderId,
  disabled,
  disabledReason,
  variant = 'outline',
  size = 'default',
  className,
}: VpsConsoleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenConsole = async () => {
    setIsLoading(true);
    try {
      const { url } = await vpsService.getConsoleUrl(orderId);

      // Open in new tab
      window.open(url, '_blank', 'noopener,noreferrer');

      toast.success('Console dibuka di tab baru');
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message || 'Gagal membuka console';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleOpenConsole}
      disabled={isDisabled}
      className={cn(className)}
      title={isDisabled && disabledReason ? disabledReason : undefined}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Terminal className="h-4 w-4" />
      )}
      {size !== 'icon' && <span className="ml-2">Console</span>}
      {size !== 'icon' && (
        <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
      )}
    </Button>
  );
}
