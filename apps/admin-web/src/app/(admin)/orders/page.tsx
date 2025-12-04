'use client';

import { Search, ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useAdminOrders, useUpdatePaymentStatus } from '@/hooks/use-admin-orders';
import {
  formatCurrency,
  formatDateShort,
  getOrderStatusLabel,
  getOrderStatusVariant,
} from '@/lib/utils';
import type { OrderStatus, OrderFilters } from '@/types';

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING_PAYMENT', label: 'Menunggu Pembayaran' },
  { value: 'PAYMENT_RECEIVED', label: 'Pembayaran Diterima' },
  { value: 'PROVISIONING', label: 'Sedang Diproses' },
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'EXPIRED', label: 'Kadaluarsa' },
];

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({
    page: 1,
    limit: 10,
    status: undefined,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkActionOpen, setIsBulkActionOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: ordersData, isLoading, refetch } = useAdminOrders(filters);
  const { mutateAsync: updatePayment } = useUpdatePaymentStatus();
  const orders = ordersData?.items || [];
  const totalPages = ordersData?.totalPages || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, search: searchInput, page: 1 });
    setSelectedIds([]);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as OrderStatus | '';
    setFilters({
      ...filters,
      status: status || undefined,
      page: 1,
    });
    setSelectedIds([]);
  };

  const handlePageChange = (newPage: number) => {
    setFilters({ ...filters, page: newPage });
    setSelectedIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (orders.length === 0) return;
    
    const allSelected = orders.every((order) => selectedIds.includes(order.id));
    
    if (allSelected) {
      // Deselect all on current page
      const newSelected = selectedIds.filter(
        (id) => !orders.find((order) => order.id === id)
      );
      setSelectedIds(newSelected);
    } else {
      // Select all on current page
      const newIds = orders
        .map((order) => order.id)
        .filter((id) => !selectedIds.includes(id));
      setSelectedIds([...selectedIds, ...newIds]);
    }
  };

  const openBulkActionDialog = (type: 'approve' | 'reject') => {
    setBulkActionType(type);
    setIsBulkActionOpen(true);
  };

  const executeBulkAction = async () => {
    if (!bulkActionType) return;
    
    setIsProcessing(true);
    try {
      const status = bulkActionType === 'approve' ? 'PAID' : 'FAILED';
      
      // Process in parallel
      await Promise.all(
        selectedIds.map((id) =>
          updatePayment({ orderId: id, data: { status } })
        )
      );

      toast.success(
        `${selectedIds.length} pesanan berhasil ${
          bulkActionType === 'approve' ? 'disetujui' : 'ditolak'
        }`
      );
      setSelectedIds([]);
      setIsBulkActionOpen(false);
      refetch();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Gagal memproses beberapa pesanan');
    } finally {
      setIsProcessing(false);
    }
  };

  const isAllSelected = orders.length > 0 && orders.every((order) => selectedIds.includes(order.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
          Manajemen Pesanan
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Lihat dan kelola semua pesanan
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <Input
            placeholder="Cari order ID atau email..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <div className="flex gap-2">
          <Select
            options={statusOptions}
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-48"
          />
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filter
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {selectedIds.length} pesanan dipilih
          </span>
          <div className="flex gap-2 ml-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openBulkActionDialog('approve')}
              className="text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              Setujui Pembayaran
            </Button>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => openBulkActionDialog('reject')}
            >
              Tolak Pesanan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Batalkan
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <Card>
        <CardContent noPadding>
          {isLoading ? (
            <div className="p-6">
              <SkeletonTable rows={10} />
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                    <th className="px-6 py-3 w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        aria-label="Pilih semua pesanan"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className={`transition-colors ${
                        selectedIds.includes(order.id) 
                          ? 'bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10' 
                          : 'hover:bg-[var(--hover-bg)]'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          checked={selectedIds.includes(order.id)}
                          onChange={() => handleSelect(order.id)}
                          aria-label={`Pilih pesanan ${order.id}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-medium text-[var(--primary)] hover:underline"
                        >
                          #{order.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                        {order.userEmail || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getOrderStatusVariant(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                        {formatDateShort(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <p className="text-[var(--text-primary)] font-medium mb-1">
                Tidak Ada Pesanan
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Tidak ada pesanan yang sesuai dengan filter
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Halaman {filters.page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange((filters.page || 1) - 1)}
              disabled={(filters.page || 1) <= 1}
              leftIcon={<ChevronLeft className="h-4 w-4" />}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange((filters.page || 1) + 1)}
              disabled={(filters.page || 1) >= totalPages}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={isBulkActionOpen} onOpenChange={setIsBulkActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Tindakan Massal</DialogTitle>
            <DialogDescription>
              Anda akan {bulkActionType === 'approve' ? 'menyetujui' : 'menolak'} {selectedIds.length} pesanan yang dipilih. 
              Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkActionOpen(false)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button
              variant={bulkActionType === 'reject' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {bulkActionType === 'approve' ? 'Setujui Pembayaran' : 'Tolak Pesanan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
