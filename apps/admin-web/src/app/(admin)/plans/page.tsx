'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Server, Cpu, HardDrive, Gauge } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePlans, useDeletePlan, useUpdatePlan, VpsPlan } from '@/hooks/use-plans';
import { CreatePlanDialog } from './create-plan-dialog';
import { EditPlanDialog } from './edit-plan-dialog';

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)} GB`;
  }
  return `${mb} MB`;
}

function formatPrice(price: number | undefined): string {
  if (!price) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export default function PlansPage() {
  const { data: plans, isLoading } = usePlans();
  const deletePlan = useDeletePlan();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<VpsPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VpsPlan | null>(null);

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deletePlan.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paket VPS</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola paket VPS yang tersedia untuk pelanggan
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Paket
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Paket
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-12" /> : plans?.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paket Aktif
            </CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                plans?.filter((p) => p.isActive).length || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paket Nonaktif
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                plans?.filter((p) => !p.isActive).length || 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Provider
            </CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">DigitalOcean</div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Paket</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : plans && plans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Spesifikasi</TableHead>
                  <TableHead>Provider Slug</TableHead>
                  <TableHead>Harga/Bulan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.displayName}</div>
                        <div className="text-xs text-muted-foreground">{plan.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div>{plan.cpu} vCPU</div>
                        <div>{formatBytes(plan.memoryMb)} RAM</div>
                        <div>{plan.diskGb} GB SSD</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {plan.providerSizeSlug}
                      </code>
                    </TableCell>
                    <TableCell>{formatPrice(plan.priceMonthly)}</TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Edit"
                          onClick={() => setEditPlan(plan)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Hapus"
                          onClick={() => setDeleteConfirm(plan)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Belum ada paket</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Tambahkan paket VPS pertama Anda
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Paket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <CreatePlanDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Edit Plan Dialog */}
      <EditPlanDialog 
        plan={editPlan} 
        open={!!editPlan} 
        onOpenChange={(open) => !open && setEditPlan(null)} 
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Paket?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anda yakin ingin menghapus paket &quot;{deleteConfirm?.displayName}&quot;? 
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
