'use client';

import { Cpu, HardDrive, Wifi, Server } from 'lucide-react';

import { cn } from '@/lib/utils';

interface VpsSpecsDisplayProps {
  vcpu: number;
  memory: number; // in MB
  disk: number; // in GB
  bandwidth: number; // in GB, 0 = unlimited
  variant?: 'inline' | 'grid' | 'compact';
  className?: string;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  }
  return `${mb} MB`;
}

function formatBandwidth(gb: number): string {
  if (gb === 0) return 'Unlimited';
  if (gb >= 1000) {
    return `${(gb / 1000).toFixed(gb % 1000 === 0 ? 0 : 1)} TB`;
  }
  return `${gb} GB`;
}

export function VpsSpecsDisplay({
  vcpu,
  memory,
  disk,
  bandwidth,
  variant = 'inline',
  className,
}: VpsSpecsDisplayProps) {
  const specs = [
    {
      icon: Cpu,
      label: 'CPU',
      value: `${vcpu} vCPU`,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Server,
      label: 'RAM',
      value: formatMemory(memory),
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: HardDrive,
      label: 'SSD',
      value: `${disk} GB`,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      icon: Wifi,
      label: 'Bandwidth',
      value: formatBandwidth(bandwidth),
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  // Compact variant - small inline badges
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {specs.map((spec) => (
          <span
            key={spec.label}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]"
          >
            <spec.icon className="h-3 w-3" />
            {spec.value}
          </span>
        ))}
      </div>
    );
  }

  // Grid variant - card style boxes
  if (variant === 'grid') {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-4 text-center transition-all hover:border-[var(--primary)]/30"
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center',
                spec.bg
              )}
            >
              <spec.icon className={cn('h-5 w-5', spec.color)} />
            </div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{spec.value}</p>
            <p className="text-xs text-[var(--text-muted)]">{spec.label}</p>
          </div>
        ))}
      </div>
    );
  }

  // Inline variant - horizontal pills
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {specs.map((spec) => (
        <div
          key={spec.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
            spec.bg
          )}
        >
          <spec.icon className={cn('h-3.5 w-3.5', spec.color)} />
          <span className="text-sm font-medium text-[var(--text-primary)]">{spec.value}</span>
        </div>
      ))}
    </div>
  );
}
