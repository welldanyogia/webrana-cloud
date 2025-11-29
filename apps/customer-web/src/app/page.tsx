'use client';

import Link from 'next/link';
import { Cloud } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';

// Landing Page Components
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { WhyUsSection } from '@/components/landing/WhyUsSection';
import { TechSpecsSection } from '@/components/landing/TechSpecsSection';
import { FooterSection } from '@/components/landing/FooterSection';
import { FaqSection } from '@/components/landing/FaqSection';

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
