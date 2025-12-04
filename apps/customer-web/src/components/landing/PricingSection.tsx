"use client";

import { Cpu, MemoryStick, HardDrive, Network } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      name: 'Basic VPS',
      vCPU: '1 Core',
      RAM: '1 GB',
      Storage: '25 GB NVMe',
      Bandwidth: '1 TB',
      price: {
        daily: '2.000',
        monthly: '50.000',
        yearly: '500.000',
      },
      highlight: false,
      btnText: 'Pilih Basic',
      btnVariant: 'outline' as const,
    },
    {
      name: 'Standard VPS',
      vCPU: '2 Cores',
      RAM: '2 GB',
      Storage: '50 GB NVMe',
      Bandwidth: '2 TB',
      price: {
        daily: '4.000',
        monthly: '100.000',
        yearly: '1.000.000',
      },
      highlight: true,
      btnText: 'Pilih Standard',
      btnVariant: 'primary' as const,
    },
    {
      name: 'Pro VPS',
      vCPU: '4 Cores',
      RAM: '8 GB',
      Storage: '160 GB NVMe',
      Bandwidth: '5 TB',
      price: {
        daily: '16.000',
        monthly: '400.000',
        yearly: '4.000.000',
      },
      highlight: false,
      btnText: 'Pilih Pro',
      btnVariant: 'outline' as const,
    },
  ];

  return (
    <section className="relative py-24 overflow-hidden" id="pricing">
      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-muted/30" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Pilihan Paket Cloud VPS
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Performa maksimal dengan harga transparan. Upgrade kapan saja.
          </p>

          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'daily' | 'monthly' | 'yearly')} className="w-full max-w-md mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Harian</TabsTrigger>
              <TabsTrigger value="monthly">Bulanan</TabsTrigger>
              <TabsTrigger value="yearly">Tahunan (Hemat)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-4 md:gap-8 items-start overflow-x-auto snap-x snap-mandatory pb-8 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className="min-w-[85vw] sm:min-w-[350px] md:min-w-0 snap-center h-full"
            >
              <Card
                className={`relative flex flex-col h-full transition-all duration-300 ${
                  plan.highlight 
                    ? 'border-brand shadow-lg shadow-brand/10 z-10' 
                    : 'border-border hover:border-brand/50'
                }`}
                highlighted={plan.highlight}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand text-white hover:bg-brand/90 px-4 py-1 uppercase text-xs tracking-wide">
                      Rekomendasi
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8 pb-6">
                  <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 text-foreground">
                    <span className="text-sm font-medium text-muted-foreground">Rp</span>
                    <span className="text-4xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {plan.price[billingCycle]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    / {billingCycle === 'daily' ? 'hari' : billingCycle === 'monthly' ? 'bulan' : 'tahun'}
                  </p>
                  {billingCycle === 'yearly' && (
                    <p className="text-xs font-medium mt-2 text-green-600 dark:text-green-400">
                      Hemat 2 bulan pembayaran!
                    </p>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <Cpu className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">CPU</span>
                        <span className="font-medium text-foreground">{plan.vCPU}</span>
                      </div>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <MemoryStick className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Memory</span>
                        <span className="font-medium text-foreground">{plan.RAM}</span>
                      </div>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <HardDrive className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Storage</span>
                        <span className="font-medium text-foreground">{plan.Storage}</span>
                      </div>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                        <Network className="h-3.5 w-3.5 text-brand" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Bandwidth</span>
                        <span className="text-muted-foreground">{plan.Bandwidth}</span>
                      </div>
                    </li>
                  </ul>
                </CardContent>

                <CardFooter className="pt-6 pb-8">
                  <Link href="/register" className="w-full">
                    <Button 
                      variant={plan.btnVariant}
                      className="w-full"
                      size="lg"
                    >
                      {plan.btnText}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
