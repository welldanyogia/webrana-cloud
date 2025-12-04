"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { hoverLift } from '@/lib/motion';
import { WorldMap } from '@/components/ui/world-map';

export function FeaturesSection() {
  const features = [
    {
      title: 'Penyimpanan NVMe Enterprise',
      description: 'Rasakan performa I/O hingga 10x lebih cepat dibandingkan SSD biasa. Optimal untuk database, high-traffic website, dan aplikasi berat.',
      image: '/images/landing/feature-nvme.jpg',
      alt: 'Komponen NVMe SSD dengan lighting futuristik',
    },
    {
      title: 'Keamanan Terjamin',
      description: 'Dilengkapi dengan proteksi DDoS layer 3/4 dan Firewall bawaan untuk menjaga server Anda tetap aman dari serangan siber.',
      image: '/images/landing/why-us-dev.jpg',
      alt: 'Ilustrasi keamanan cyber security',
    },
    {
      title: 'Instant Deploy',
      description: 'Tidak perlu menunggu manual approval. Server Anda aktif dan siap digunakan kurang dari 60 detik setelah pembayaran terverifikasi.',
      image: '/images/landing/feature-speed.jpg',
      alt: 'Ilustrasi roket 3D yang meluncur',
    },
    {
      title: 'Metode Pembayaran Lengkap',
      description: 'Mendukung pembayaran via QRIS, Virtual Account Bank, dan Minimarket. Tanpa kartu kredit.',
      image: '/images/landing/feature-payment.jpg',
      alt: 'Pembayaran QRIS dan E-wallet',
    },
  ];

  return (
    <section className="py-20 bg-background" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Infrastruktur Premium, Skala Global
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Teknologi terbaru dengan jaringan data center yang tersebar di seluruh dunia.
          </p>
        </motion.div>

        {/* Global Network Map Section */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-20 relative"
        >
          <div className="text-center mb-8 z-10 relative">
            <h3 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">Global Data Center Locations</h3>
            <p className="text-muted-foreground">
              Deploy server Anda di lokasi strategis yang dekat dengan user Anda.
            </p>
          </div>
          
          <div className="w-full h-[500px] bg-card/30 border border-border rounded-lg relative flex items-center justify-center overflow-hidden backdrop-blur-sm">
             <div className="w-full h-full">
                <WorldMap
                    dots={[
                      {
                        start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Remote)
                        end: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
                      },
                      {
                        start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Remote)
                        end: { lat: -15.7975, lng: -47.8919 }, // Brazil
                      },
                      {
                        start: { lat: -15.7975, lng: -47.8919 }, // Brazil
                        end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
                      },
                      {
                        start: { lat: 51.5074, lng: -0.1278 }, // London
                        end: { lat: 28.6139, lng: 77.209 }, // New Delhi
                      },
                      {
                        start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                        end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
                      },
                      {
                        start: { lat: 28.6139, lng: 77.209 }, // New Delhi
                        end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
                      },
                      {
                          start: { lat: 1.3521, lng: 103.8198 }, // Singapore
                          end: { lat: -6.2088, lng: 106.8456 }, // Jakarta
                      },
                      {
                          start: { lat: -6.2088, lng: 106.8456 }, // Jakarta
                          end: { lat: 35.6762, lng: 139.6503 }, // Tokyo
                      }
                    ]}
                    lineColor="hsl(var(--primary))"
                />
             </div>
             
             {/* Floating Location Tags */}
             <div className="absolute bottom-10 left-10 hidden md:block p-4 bg-background/80 backdrop-blur-md rounded-xl border border-border shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="text-sm font-medium">Jakarta Node Active</span>
                </div>
             </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div key={index} whileHover={hoverLift}>
              <Card 
                className="overflow-hidden border-border bg-card h-full flex flex-col"
                hover={true}
                glow={true}
              >
                <div className="relative h-48 w-full bg-muted">
                  <Image
                    src={feature.image}
                    alt={feature.alt}
                    fill
                    className="object-cover transition-transform duration-500 hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
                <CardHeader noBorder>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent noPadding className="px-6 pb-6 pt-0">
                  <CardDescription className="text-sm leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
