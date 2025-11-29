'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Eye, Search, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '@/hooks/use-billing';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice } from '@/types';

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <Badge variant="success">Lunas</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Menunggu</Badge>;
    case 'EXPIRED':
      return <Badge variant="danger">Kadaluarsa</Badge>;
    case 'CANCELLED':
      return <Badge variant="default">Dibatalkan</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        Belum Ada Invoice
      </h3>
      <p className="text-[var(--text-muted)] mb-6">
        Anda belum memiliki invoice. Buat pesanan VPS untuk memulai.
      </p>
      <Link href="/catalog">
        <Button>Pesan VPS</Button>
      </Link>
    </div>
  );
}

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useInvoices({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const invoices = data?.data || [];
  const meta = data?.meta;

  // Calculate summary stats
  const pendingTotal = invoices
    .filter(inv => inv.status === 'PENDING')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const paidThisMonth = invoices
    .filter(inv => {
      if (inv.status !== 'PAID' || !inv.paidAt) return false;
      const paidDate = new Date(inv.paidAt);
      const now = new Date();
      return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Filter by search
  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Gagal Memuat Invoice
        </h3>
        <p className="text-[var(--text-muted)] mb-6">
          Terjadi kesalahan saat memuat data invoice. Silakan coba lagi.
        </p>
        <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
      </div>
    );
  }

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
              {formatCurrency(pendingTotal)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Dibayar Bulan Ini</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {formatCurrency(paidThisMonth)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--text-secondary)]">Total Invoice</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {meta?.total || invoices.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Daftar Invoice</CardTitle>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)]"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="PAID">Lunas</option>
              <option value="EXPIRED">Kadaluarsa</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Cari invoice..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        No. Invoice
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Tanggal
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
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-[var(--text-primary)]">
                            {invoice.invoiceNumber}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(invoice.expiredAt)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {invoice.status === 'PENDING' && (
                              <Link href={`/order/${invoice.orderId}/payment`}>
                                <Button size="sm">
                                  Bayar
                                </Button>
                              </Link>
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
                {filteredInvoices.map((invoice) => (
                  <div key={invoice.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="font-medium text-[var(--text-primary)]">
                        {formatCurrency(invoice.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Link href={`/invoices/${invoice.id}`} className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat
                        </Button>
                      </Link>
                      {invoice.status === 'PENDING' && (
                        <Link href={`/order/${invoice.orderId}/payment`} className="flex-1">
                          <Button size="sm" className="w-full">
                            Bayar
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--text-muted)]">
                    Halaman {meta.page} dari {meta.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                      disabled={page === meta.totalPages}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
