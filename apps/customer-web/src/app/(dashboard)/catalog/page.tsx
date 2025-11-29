'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Cpu, HardDrive, Wifi, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Plan {
  id: string;
  name: string;
  cpu: string;
  ram: string;
  storage: string;
  bandwidth: string;
  price: number;
  popular?: boolean;
  description: string;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    cpu: '1 vCPU',
    ram: '1 GB RAM',
    storage: '25 GB SSD',
    bandwidth: '1 TB Transfer',
    price: 50000,
    description: 'Cocok untuk project kecil, development, dan testing environment.',
  },
  {
    id: 'basic',
    name: 'Basic',
    cpu: '2 vCPU',
    ram: '2 GB RAM',
    storage: '50 GB SSD',
    bandwidth: '2 TB Transfer',
    price: 100000,
    popular: true,
    description: 'Ideal untuk website personal, blog, dan aplikasi ringan.',
  },
  {
    id: 'standard',
    name: 'Standard',
    cpu: '2 vCPU',
    ram: '4 GB RAM',
    storage: '80 GB SSD',
    bandwidth: '3 TB Transfer',
    price: 200000,
    description: 'Untuk website bisnis dan aplikasi dengan traffic menengah.',
  },
  {
    id: 'pro',
    name: 'Professional',
    cpu: '4 vCPU',
    ram: '8 GB RAM',
    storage: '160 GB SSD',
    bandwidth: '4 TB Transfer',
    price: 400000,
    description: 'Power untuk aplikasi production dengan traffic tinggi.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    cpu: '8 vCPU',
    ram: '16 GB RAM',
    storage: '320 GB SSD',
    bandwidth: '5 TB Transfer',
    price: 800000,
    description: 'Untuk workload enterprise, database besar, dan multi-service.',
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    cpu: '16 vCPU',
    ram: '32 GB RAM',
    storage: '640 GB SSD',
    bandwidth: '6 TB Transfer',
    price: 1600000,
    description: 'Performa maksimal untuk aplikasi mission-critical dan high-availability.',
  },
];

export default function CatalogPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (basePrice: number) => {
    if (billingCycle === 'yearly') {
      return basePrice * 10; // 2 months free for yearly
    }
    return basePrice;
  };

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
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-[var(--card-bg)] rounded-xl border p-5 transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] ${
              plan.popular
                ? 'border-[var(--primary)]/50 shadow-[var(--card-shadow)]'
                : 'border-[var(--border)] hover:border-[var(--border-hover)]'
            }`}
          >
            {plan.popular && (
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
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
                {plan.description}
              </p>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                  Rp {getPrice(plan.price).toLocaleString('id-ID')}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  /{billingCycle === 'monthly' ? 'bln' : 'thn'}
                </span>
              </div>
              {billingCycle === 'yearly' && (
                <p className="text-[10px] text-[var(--success)] mt-0.5">
                  Hemat Rp {(plan.price * 2).toLocaleString('id-ID')}/tahun
                </p>
              )}
            </div>

            {/* Specs */}
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                  <Cpu className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </div>
                {plan.cpu}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                  <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                {plan.ram}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                  <HardDrive className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </div>
                {plan.storage}
              </li>
              <li className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                <div className="w-7 h-7 bg-[var(--surface)] rounded-md flex items-center justify-center shrink-0">
                  <Wifi className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </div>
                {plan.bandwidth}
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
                variant={plan.popular ? 'primary' : 'outline'}
                size="sm"
              >
                Pilih Paket
              </Button>
            </Link>
          </div>
        ))}
      </div>

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
