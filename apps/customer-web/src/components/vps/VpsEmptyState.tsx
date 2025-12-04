'use client';

import { Server, Plus, Cloud, Zap, Shield, Globe } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VpsEmptyStateProps {
  className?: string;
}

export function VpsEmptyState({ className }: VpsEmptyStateProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_50%_200px,var(--primary),transparent)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative py-16 px-6 text-center">
        {/* Illustration */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Floating Icons */}
          <div className="absolute -left-4 top-2 animate-bounce" style={{ animationDelay: '0s' }}>
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Cloud className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <div
            className="absolute -right-4 top-4 animate-bounce"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div
            className="absolute left-0 bottom-0 animate-bounce"
            style={{ animationDelay: '0.4s' }}
          >
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div
            className="absolute right-0 bottom-2 animate-bounce"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-amber-400" />
            </div>
          </div>

          {/* Main Server Icon */}
          <div className="absolute inset-4 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--primary)]/25">
            <Server className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
          Belum Ada VPS
        </h3>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8">
          Mulai perjalanan cloud Anda sekarang. Deploy VPS pertama Anda dalam hitungan
          menit dengan performa tinggi dan keandalan maksimal.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] justify-center sm:justify-start">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>Deploy Instant</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] justify-center">
            <Shield className="h-4 w-4 text-blue-400" />
            <span>SSD NVMe</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] justify-center sm:justify-end">
            <Globe className="h-4 w-4 text-amber-400" />
            <span>Multi Region</span>
          </div>
        </div>

        {/* CTA Button */}
        <Link href="/catalog">
          <Button size="lg" className="group">
            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
            Buat VPS Pertama
          </Button>
        </Link>
      </div>
    </div>
  );
}
