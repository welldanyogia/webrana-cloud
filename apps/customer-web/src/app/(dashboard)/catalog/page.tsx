'use client';

import { Check, Cpu, HardDrive, Wifi, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlans } from '@/hooks/use-catalog';
import type { VpsPlan, DurationUnit } from '@/types';

function formatRam(ramMb: number): string {
  if (ramMb >= 1024) {
    return `${ramMb / 1024} GB`;
  }
  return `${ramMb} MB`;
}

function formatBandwidth(bandwidthGb: number): string {
  if (bandwidthGb >= 1000) {
    return `${bandwidthGb / 1000} TB`;
  }
  return `${bandwidthGb} GB`;
}

function getPlanPrice(plan: VpsPlan, billingCycle: DurationUnit): number {
  const pricing = plan.pricing?.find((p) => p.duration === billingCycle);
  return pricing?.price ?? plan.priceMonthly ?? 0;
}

export default function CatalogPage() {
  const [billingCycle, setBillingCycle] = useState<DurationUnit>('MONTHLY');
  const { data: plans, isLoading, error } = usePlans();

  const activePlans = plans?.filter((p) => p.isActive) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Pilih Paket VPS
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Pilih spesifikasi sesuai kebutuhan Anda
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              billingCycle === 'YEARLY'
                ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Tahunan
            <span className="text-[10px] bg-[var(--success-bg)] text-[var(--success)] px-1.5 py-0.5 rounded font-semibold">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-[var(--error)] mx-auto mb-2" />
          <p className="text-sm text-[var(--error)]">
            Gagal memuat paket VPS. Silakan coba lagi.
          </p>
        </div>
      ) : activePlans.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Belum ada paket VPS yang tersedia.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activePlans.map((plan, index) => {
            const isPopular = index === 1; // Second plan is popular
            const price = getPlanPrice(plan, billingCycle);

            return (
              <div
                key={plan.id}
                className={`relative bg-[var(--card-bg)] rounded-xl border p-5 transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] ${
                  isPopular
                    ? 'border-[var(--primary)]/50 shadow-[var(--card-shadow)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-2.5 left-5">
                    <span className="bg-[var(--primary)] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Populer
                    </span>
                  </div>
                )}

                {/* Plan Name */}
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                      {plan.description}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      Rp {price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      /{billingCycle === 'MONTHLY' ? 'bln' : 'thn'}
                    </span>
                  </div>
                  {billingCycle === 'YEARLY' && (
                    <p className="text-[10px] text-[var(--success)] mt-0.5">
                      Hemat ~17% dibanding bulanan
                    </p>
                  )}
                </div>

                {/* Specs */}
                <ul className="space-y-2 mb-4">
                  <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                      <Cpu className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    {plan.cpu} vCPU
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                      <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    {formatRam(plan.ram)}
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                      <HardDrive className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    {plan.ssd} GB SSD
                  </li>
                  <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                    <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                      <Wifi className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                    </div>
                    {formatBandwidth(plan.bandwidth)}
                  </li>
                </ul>

                {/* Features */}
                <div className="border-t border-[var(--border)] pt-3 mb-4">
                  <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Termasuk:
                  </p>
                  <ul className="space-y-1.5">
                    {['Root access', 'IPv4 dedicated', 'DDoS protection', 'Support 24/7'].map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Check className="h-3.5 w-3.5 text-[var(--success)] shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Link href={`/order/new?plan=${plan.id}&cycle=${billingCycle}`}>
                  <Button
                    className="w-full"
                    variant={isPopular ? 'primary' : 'outline'}
                    size="sm"
                  >
                    Pilih Paket
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Plan CTA */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 text-center">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
          Butuh Spesifikasi Khusus?
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4 max-w-sm mx-auto">
          Hubungi tim kami untuk konsultasi dan solusi VPS yang disesuaikan.
        </p>
        <Button variant="secondary" size="sm">
          Hubungi Tim Sales
        </Button>
      </div>
    </div>
  );
}
