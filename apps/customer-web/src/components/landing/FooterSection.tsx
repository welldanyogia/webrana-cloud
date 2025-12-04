import { ArrowRight, Cloud } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export function FooterSection() {
  return (
    <>
      {/* CTA Section - Vercel Style (Clean Black/White High Contrast) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-foreground text-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight text-background">
            Siap Membangun Projek Impian Anda?
          </h2>
          <p className="text-lg text-background/80 mb-10 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan developer Indonesia yang memilih WeBrana Cloud untuk performa dan skalabilitas.
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 font-bold h-12 px-8 rounded-md transition-all hover:scale-105"
            >
              Buat Akun Gratis Sekarang
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer Links */}
      <footer className="border-t border-border bg-card pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
                  <Cloud className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-bold text-foreground tracking-tight">
                  Webrana Cloud
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Cloud VPS Indonesia – Cepat, Mudah, Terjangkau.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-brand">Compute</Link></li>
                <li><Link href="#" className="hover:text-brand">Storage</Link></li>
                <li><Link href="#" className="hover:text-brand">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-brand">About</Link></li>
                <li><Link href="#" className="hover:text-brand">Contact</Link></li>
                <li><Link href="#" className="hover:text-brand">Careers</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-brand">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-brand">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Webrana Cloud. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
