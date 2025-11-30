'use client';

import { Badge } from '@/components/ui/badge';
import type { DoAccount } from '@/lib/api/do-accounts';

type HealthStatus = DoAccount['healthStatus'];

interface HealthStatusBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'default' | 'md' | 'lg';
  showDot?: boolean;
}

/**
 * Badge component for displaying DO account health status
 */
export function HealthStatusBadge({
  status,
  size = 'default',
  showDot = true,
}: HealthStatusBadgeProps) {
  const config: Record<
    HealthStatus,
    { variant: 'success' | 'warning' | 'danger' | 'secondary'; label: string }
  > = {
    HEALTHY: { variant: 'success', label: 'Healthy' },
    DEGRADED: { variant: 'warning', label: 'Degraded' },
    UNHEALTHY: { variant: 'danger', label: 'Unhealthy' },
    UNKNOWN: { variant: 'secondary', label: 'Unknown' },
  };

  const { variant, label } = config[status] || config.UNKNOWN;

  return (
    <Badge variant={variant} size={size} dot={showDot}>
      {label}
    </Badge>
  );
}
