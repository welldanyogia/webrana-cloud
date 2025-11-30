'use client';

import { Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { CapacityBar } from './CapacityBar';
import { HealthStatusBadge } from './HealthStatusBadge';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { DoAccount } from '@/lib/api/do-accounts';
import { cn } from '@/lib/utils';

interface DoAccountCardProps {
  account: DoAccount;
  className?: string;
}

/**
 * Card component displaying summary of a DO account
 */
export function DoAccountCard({ account, className }: DoAccountCardProps) {
  return (
    <Link href={`/settings/do-accounts/${account.id}`}>
      <Card
        hover
        className={cn(
          'transition-all duration-200 group',
          !account.isActive && 'opacity-60',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {account.isPrimary && (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                )}
                <h3 className="font-medium text-[var(--text-primary)] truncate">
                  {account.name}
                </h3>
                {!account.isActive && (
                  <Badge variant="secondary" size="sm">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[var(--text-muted)] truncate">
                {account.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HealthStatusBadge status={account.healthStatus} size="sm" />
              <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
            </div>
          </div>

          <div className="mt-3">
            <CapacityBar
              used={account.activeDroplets}
              limit={account.dropletLimit}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
