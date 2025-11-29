'use client';

import { Download, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

// Mock data - replace with actual API call
const invoices = [
  {
    id: 'INV-2024-001',
    date: '2024-03-01',
    dueDate: '2024-03-08',
    amount: 100000,
    status: 'paid',
    description: 'VPS Basic - Maret 2024',
  },
  {
    id: 'INV-2024-002',
    date: '2024-03-15',
    dueDate: '2024-03-22',
    amount: 200000,
    status: 'pending',
    description: 'VPS Standard - Maret 2024',
  },
  {
    id: 'INV-2024-003',
    date: '2024-02-01',
    dueDate: '2024-02-08',
    amount: 100000,
    status: 'paid',
    description: 'VPS Basic - Februari 2024',
  },
  {
    id: 'INV-2024-004',
    date: '2024-01-01',
    dueDate: '2024-01-08',
    amount: 100000,
    status: 'paid',
    description: 'VPS Basic - Januari 2024',
  },
];

export default function InvoicesPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Lunas</Badge>;
      case 'pending':
        return <Badge variant="warning">Menunggu</Badge>;
      case 'overdue':
        return <Badge variant="danger">Terlambat</Badge>;
      case 'cancelled':
        return <Badge variant="default">Dibatalkan</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Tagihan & Invoice
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Riwayat pembayaran dan faktur Anda
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Belum Dibayar</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {formatCurrency(200000)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Dibayar Bulan Ini</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {formatCurrency(100000)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Total Invoice</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {invoices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Daftar Invoice</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Cari invoice..."
              className="pl-9 h-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    No. Invoice
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Tanggal Dibuat
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Jatuh Tempo
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {invoice.id}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {invoice.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {formatDate(invoice.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'pending' && (
                          <Button size="sm">
                            Bayar Sekarang
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden divide-y divide-[var(--border)]">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {invoice.id}
                    </p>
                    <p className="text-sm text-[var(--text-muted)]">
                      {invoice.description}
                    </p>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-[var(--text-secondary)]">
                    {formatDate(invoice.date)}
                  </div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(invoice.amount)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Lihat
                  </Button>
                  {invoice.status === 'pending' && (
                    <Button size="sm" className="flex-1">
                      Bayar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
