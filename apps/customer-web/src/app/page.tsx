'use client';

import { Cloud } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import { HeroSection } from '@/components/landing/HeroSection';
import { SectionSkeleton } from '@/components/landing/SectionSkeleton';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const FeaturesSection = dynamic(
  () => import('@/components/landing/FeaturesSection').then((mod) => mod.FeaturesSection),
  { loading: () => <SectionSkeleton /> }
);

const PricingSection = dynamic(
  () => import('@/components/landing/PricingSection').then((mod) => mod.PricingSection),
  { loading: () => <SectionSkeleton /> }
);

const WhyUsSection = dynamic(
  () => import('@/components/landing/WhyUsSection').then((mod) => mod.WhyUsSection),
  { loading: () => <SectionSkeleton /> }
);

const TechSpecsSection = dynamic(
  () => import('@/components/landing/TechSpecsSection').then((mod) => mod.TechSpecsSection),
  { loading: () => <SectionSkeleton /> }
);

const FaqSection = dynamic(
  () => import('@/components/landing/FaqSection').then((mod) => mod.FaqSection),
  { loading: () => <SectionSkeleton /> }
);

const FooterSection = dynamic(
  () => import('@/components/landing/FooterSection').then((mod) => mod.FooterSection),
  { loading: () => <SectionSkeleton /> }
);

export default function Home() {
  return (
    <div className="min-h-screen bg-background selection:bg-brand selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-indigo-600 flex items-center justify-center shadow-lg shadow-brand/20 group-hover:shadow-brand/40 transition-all">
                <Cloud className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                Webrana
              </span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <div className="hidden sm:block w-px h-6 bg-border mx-1" />
              <Link
                href="/login"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Masuk
              </Link>
              <Link href="/register">
                <Button size="sm" variant="primary" className="font-semibold shadow-md shadow-brand/20">
                  Daftar Gratis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <WhyUsSection />
        <TechSpecsSection />
        <FaqSection />
      </main>

      <FooterSection />
    </div>
  );
}
