'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
          Analitik
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Statistik dan laporan platform
        </p>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardContent>
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-[var(--primary-muted)] rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              Segera Hadir
            </h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
              Fitur analitik sedang dalam pengembangan. Anda akan dapat melihat grafik pesanan per hari, 
              pendapatan, dan statistik lainnya di sini.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
