'use client';

import Link from 'next/link';
import {
  Server,
  Power,
  RefreshCw,
  Terminal,
  MoreVertical,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Mock data - replace with actual API call
const instances = [
  {
    id: '1',
    name: 'web-server-01',
    status: 'running',
    ip: '103.28.14.52',
    plan: 'Basic',
    cpu: '2 vCPU',
    ram: '2 GB',
    location: 'Singapore',
    os: 'Ubuntu 22.04',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'db-server-01',
    status: 'running',
    ip: '103.28.14.53',
    plan: 'Standard',
    cpu: '2 vCPU',
    ram: '4 GB',
    location: 'Singapore',
    os: 'Debian 12',
    createdAt: '2024-02-20',
  },
];

export default function VPSPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="success">Berjalan</Badge>;
      case 'stopped':
        return <Badge variant="default">Berhenti</Badge>;
      case 'provisioning':
        return <Badge variant="info">Sedang Dibuat</Badge>;
      case 'restarting':
        return <Badge variant="warning">Restart</Badge>;
      case 'failed':
        return <Badge variant="danger">Gagal</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            VPS Saya
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Kelola dan monitor server virtual Anda
          </p>
        </div>
        <Link href="/catalog">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Buat VPS Baru
          </Button>
        </Link>
      </div>

      {/* VPS List */}
      {instances.length > 0 ? (
        <div className="space-y-4">
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between p-6 gap-4">
                  {/* Instance Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[var(--primary-light)] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Server className="h-6 w-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {instance.name}
                        </h3>
                        {getStatusBadge(instance.status)}
                      </div>
                      <p className="text-sm text-[var(--text-muted)] font-mono">
                        {instance.ip}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[var(--text-secondary)]">
                        <span>{instance.plan}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span>{instance.cpu}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span>{instance.ram}</span>
                        <span className="text-[var(--text-muted)]">•</span>
                        <span>{instance.os}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="sm" title="Buka Console">
                      <Terminal className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Restart Server">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Matikan/Nyalakan">
                      <Power className="h-4 w-4" />
                    </Button>
                    <Link href={`/vps/${instance.id}`}>
                      <Button variant="outline" size="sm">
                        Kelola
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Belum Ada VPS
            </h3>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Anda belum memiliki VPS aktif. Buat VPS pertama Anda sekarang dan mulai deploy dalam hitungan menit.
            </p>
            <Link href="/catalog">
              <Button>
                Buat VPS Pertama
                <Plus className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
