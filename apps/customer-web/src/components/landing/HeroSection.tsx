import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fadeInUp } from '@/lib/motion';

export function HeroSection() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand/5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.15 }
            }
          }}
          className="text-center lg:text-left space-y-8 relative z-10"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="border-brand/20 text-brand bg-brand/5 px-4 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Powered by DigitalOcean
            </Badge>
          </motion.div>

          <motion.h1 
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
          >
            Deploy Cloud VPS Indonesia <span className="text-brand">Performa Tinggi</span> dalam 30 Detik
          </motion.h1>

          <motion.p 
            variants={fadeInUp}
            className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0"
          >
            Bangun aplikasi, website, dan startup Anda dengan infrastruktur cloud modern. Penyimpanan NVMe SSD, Data Center Jakarta, dan pembayaran lokal instan.
          </motion.p>

          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
          >
            <Link href="/register">
              <Button size="lg" variant="primary" className="h-12 px-8 text-base">
                Deploy Server Sekarang
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Lihat Pilihan Paket
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm font-medium text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              99.9% Uptime SLA
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Aktivasi Instan
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Support Bahasa Indonesia
            </div>
          </motion.div>
        </motion.div>

        {/* Hero Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          className="relative lg:h-[600px] w-full flex items-center justify-center"
        >
          <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
            <Image
              src="/images/landing/hero-dashboard.jpg"
              alt="Dashboard VPS WeBrana Cloud dengan grafik performa tinggi"
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
              quality={90}
              className="object-cover"
              priority
            />
            {/* Overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand/10 blur-3xl rounded-full opacity-50" />
        </motion.div>
      </div>
    </section>
  );
}
