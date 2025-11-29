'use client';

import Link from 'next/link';
import {
  Shield,
  Zap,
  Clock,
  CreditCard,
  Headphones,
  ArrowRight,
  Check,
  Cloud,
  Globe,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

export default function Home() {
  const features = [
    {
      icon: Zap,
      title: 'Deploy dalam Menit',
      description: 'Pilih paket, bayar, selesai. VPS Anda langsung aktif tanpa konfirmasi manual.',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'DDoS protection, firewall, dan infrastruktur aman untuk server Anda.',
    },
    {
      icon: Clock,
      title: '99.9% Uptime SLA',
      description: 'Infrastruktur DigitalOcean kelas dunia dengan ketersediaan tinggi.',
    },
    {
      icon: CreditCard,
      title: 'Bayar dalam Rupiah',
      description: 'Transfer bank, e-wallet, QRIS — metode pembayaran lokal favorit Anda.',
    },
    {
      icon: Globe,
      title: 'Global Network',
      description: 'Lokasi server tersebar di berbagai region untuk performa optimal.',
    },
    {
      icon: Headphones,
      title: 'Support 24/7',
      description: 'Tim teknis siap membantu Anda kapan saja dibutuhkan.',
    },
  ];

  const plans = [
    {
      name: 'Starter',
      cpu: '1 vCPU',
      ram: '1 GB',
      storage: '25 GB SSD',
      bandwidth: '1 TB',
      price: 50000,
    },
    {
      name: 'Basic',
      cpu: '2 vCPU',
      ram: '2 GB',
      storage: '50 GB SSD',
      bandwidth: '2 TB',
      price: 100000,
      popular: true,
    },
    {
      name: 'Standard',
      cpu: '2 vCPU',
      ram: '4 GB',
      storage: '80 GB SSD',
      bandwidth: '3 TB',
      price: 200000,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--card-bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <Cloud className="h-4 w-4 text-white" />
              </div>
              <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                Webrana
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Masuk
              </Link>
              <Link href="/register">
                <Button size="sm">Daftar Gratis</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 pb-16 lg:pt-32 lg:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[var(--gradient-hero)]" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--primary)]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-muted)] border border-[var(--primary)]/20 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            <span className="text-xs font-medium text-[var(--primary)]">
              Powered by DigitalOcean
            </span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[var(--text-primary)] tracking-tight leading-[1.15]">
            Cloud VPS Indonesia
            <br />
            <span className="text-[var(--primary)]">Siap dalam Hitungan Menit</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Deploy server dengan harga transparan dalam Rupiah. 
            Pembayaran lokal, aktivasi otomatis, tanpa ribet.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Mulai Sekarang
              </Button>
            </Link>
            <Link href="/catalog">
              <Button variant="outline" size="lg">
                Lihat Harga
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-5 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              Mulai Rp 50K/bulan
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              Tanpa biaya tersembunyi
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-[var(--success)]" />
              Full self-service
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Kenapa Pilih Webrana Cloud?
            </h2>
            <p className="mt-3 text-[var(--text-secondary)] max-w-xl mx-auto">
              VPS hosting yang dirancang untuk kebutuhan developer Indonesia
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border)] hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--border-hover)] transition-all duration-200"
              >
                <div className="w-10 h-10 bg-[var(--primary-muted)] rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-[var(--primary)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
              Paket VPS
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Pilih paket sesuai kebutuhan Anda
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-[var(--card-bg)] rounded-xl border p-5 transition-all duration-200 hover:shadow-[var(--card-shadow-hover)] ${
                  plan.popular
                    ? 'border-[var(--primary)]/50 shadow-[var(--card-shadow)]'
                    : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[var(--primary)] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Populer
                    </span>
                  </div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {plan.name}
                  </h3>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-[var(--text-primary)]">
                      Rp {plan.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]">/bln</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-5">
                  {[plan.cpu, plan.ram, plan.storage, plan.bandwidth].map((spec, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check className="h-4 w-4 text-[var(--success)] shrink-0" />
                      {spec}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    className="w-full"
                    size="sm"
                  >
                    Pilih Paket
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/catalog"
              className="inline-flex items-center text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium text-sm transition-colors"
            >
              Lihat semua paket
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 lg:py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Siap Deploy VPS?
          </h2>
          <p className="mt-3 text-white/70">
            Daftar gratis dan deploy dalam hitungan menit.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-[var(--primary)] bg-white rounded-lg hover:bg-white/90 transition-colors shadow-sm"
          >
            Daftar Gratis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <Cloud className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
                Webrana Cloud
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/terms"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Syarat & Ketentuan
              </Link>
              <Link
                href="/privacy"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Kebijakan Privasi
              </Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] text-center">
              © {new Date().getFullYear()} Webrana Cloud. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
