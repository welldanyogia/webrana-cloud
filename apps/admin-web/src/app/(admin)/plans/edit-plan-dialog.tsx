'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useUpdatePlan, VpsPlan, UpdatePlanDto } from '@/hooks/use-plans';

interface EditPlanDialogProps {
  plan: VpsPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)} GB`;
  }
  return `${mb} MB`;
}

export function EditPlanDialog({ plan, open, onOpenChange }: EditPlanDialogProps) {
  const updatePlan = useUpdatePlan();

  const form = useForm<UpdatePlanDto>({
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      isActive: true,
      allowMonthly: true,
      allowYearly: true,
      allowDaily: false,
      priceDaily: 0,
      priceMonthly: 0,
      priceYearly: 0,
    },
  });

  // Reset form when plan changes
  useEffect(() => {
    if (plan) {
      form.reset({
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description || '',
        isActive: plan.isActive,
        allowDaily: plan.allowDaily || false,
        allowMonthly: plan.allowMonthly ?? true,
        allowYearly: plan.allowYearly ?? true,
        priceDaily: plan.priceDaily || 0,
        priceMonthly: plan.priceMonthly || 0,
        priceYearly: plan.priceYearly || 0,
      });
    }
  }, [plan, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!plan) return;
    await updatePlan.mutateAsync({ id: plan.id, data });
    onOpenChange(false);
  });

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Paket: {plan.displayName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {/* Plan Info (readonly) */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="text-sm font-medium mb-2">Spesifikasi (dari DigitalOcean)</div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {plan.cpu} vCPU • {formatBytes(plan.memoryMb)} • {plan.diskGb} GB SSD • {plan.bandwidthTb} TB transfer
                </div>
                <Badge variant="outline">{plan.providerSizeSlug}</Badge>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama (slug)</Label>
                <Input
                  id="name"
                  {...form.register('name', { required: true })}
                  placeholder="basic-1vcpu-1gb"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Nama Tampilan</Label>
                <Input
                  id="displayName"
                  {...form.register('displayName', { required: true })}
                  placeholder="Basic 1 vCPU 1GB"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                {...form.register('description')}
                placeholder="Cocok untuk website kecil, blog, atau development..."
              />
            </div>

            {/* Pricing */}
            <div className="space-y-2">
              <Label>Harga (IDR)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceDaily" className="text-xs text-muted-foreground">
                    Per Hari
                  </Label>
                  <Input
                    id="priceDaily"
                    type="number"
                    {...form.register('priceDaily', { valueAsNumber: true })}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceMonthly" className="text-xs text-muted-foreground">
                    Per Bulan
                  </Label>
                  <Input
                    id="priceMonthly"
                    type="number"
                    {...form.register('priceMonthly', { valueAsNumber: true })}
                    placeholder="100000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceYearly" className="text-xs text-muted-foreground">
                    Per Tahun
                  </Label>
                  <Input
                    id="priceYearly"
                    type="number"
                    {...form.register('priceYearly', { valueAsNumber: true })}
                    placeholder="1000000"
                  />
                </div>
              </div>
            </div>

            {/* Billing Options */}
            <div className="space-y-3">
              <Label>Opsi Billing</Label>
              <Checkbox
                id="allowDaily"
                label="Izinkan Harian"
                checked={form.watch('allowDaily')}
                onChange={(e) => form.setValue('allowDaily', e.target.checked)}
              />
              <Checkbox
                id="allowMonthly"
                label="Izinkan Bulanan"
                checked={form.watch('allowMonthly')}
                onChange={(e) => form.setValue('allowMonthly', e.target.checked)}
              />
              <Checkbox
                id="allowYearly"
                label="Izinkan Tahunan"
                checked={form.watch('allowYearly')}
                onChange={(e) => form.setValue('allowYearly', e.target.checked)}
              />
            </div>

            {/* Status */}
            <Checkbox
              id="isActive"
              label="Status Aktif (ditampilkan ke pelanggan)"
              checked={form.watch('isActive')}
              onChange={(e) => form.setValue('isActive', e.target.checked)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={updatePlan.isPending}>
              {updatePlan.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
