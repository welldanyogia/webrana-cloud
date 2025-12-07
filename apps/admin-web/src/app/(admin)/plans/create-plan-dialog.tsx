'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Server, ChevronRight, Check } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useDoSizes,
  useCreatePlan,
  DoSize,
  CreatePlanDto,
} from '@/hooks/use-plans';

interface CreatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'select-size' | 'configure-plan';

function formatBytes(mb: number): string {
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(0)} GB`;
  }
  return `${mb} MB`;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}

function SizeCard({
  size,
  selected,
  onClick,
}: {
  size: DoSize;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all',
        'hover:border-primary hover:bg-primary/5',
        selected && 'border-primary bg-primary/10 ring-2 ring-primary/20'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="font-medium text-sm">{size.description || size.slug}</div>
          <div className="text-xs text-muted-foreground space-x-2">
            <span>{size.vcpus} vCPU</span>
            <span>•</span>
            <span>{formatBytes(size.memory)}</span>
            <span>•</span>
            <span>{size.disk} GB SSD</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {size.transfer} TB transfer
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-primary">
            {formatPrice(size.price_monthly)}/mo
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPrice(size.price_hourly)}/hr
          </div>
          {selected && (
            <Check className="h-5 w-5 text-primary mt-2 ml-auto" />
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {size.regions.slice(0, 5).map((region) => (
          <Badge key={region} variant="outline" className="text-xs">
            {region}
          </Badge>
        ))}
        {size.regions.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{size.regions.length - 5} more
          </Badge>
        )}
      </div>
    </button>
  );
}

export function CreatePlanDialog({ open, onOpenChange }: CreatePlanDialogProps) {
  const [step, setStep] = useState<Step>('select-size');
  const [selectedSize, setSelectedSize] = useState<DoSize | null>(null);
  const [sizeFilter, setSizeFilter] = useState('');

  const { data: sizes, isLoading: sizesLoading } = useDoSizes();
  const createPlan = useCreatePlan();

  const form = useForm<CreatePlanDto>({
    defaultValues: {
      name: '',
      displayName: '',
      description: '',
      provider: 'digitalocean',
      isActive: true,
      allowMonthly: true,
      allowYearly: true,
      allowDaily: false,
      sortOrder: 0,
      tags: [],
    },
  });

  // Filter and group sizes by type
  const filteredSizes = useMemo(() => {
    if (!sizes) return [];
    
    let filtered = sizes.filter((s) => s.available);
    
    if (sizeFilter) {
      const filter = sizeFilter.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.slug.toLowerCase().includes(filter) ||
          s.description?.toLowerCase().includes(filter) ||
          `${s.vcpus}`.includes(filter) ||
          `${s.memory}`.includes(filter)
      );
    }

    // Sort by price
    return filtered.sort((a, b) => a.price_monthly - b.price_monthly);
  }, [sizes, sizeFilter]);

  const handleSelectSize = (size: DoSize) => {
    setSelectedSize(size);
  };

  const handleContinue = () => {
    if (!selectedSize) return;

    // Pre-fill form with size data
    form.setValue('name', selectedSize.slug);
    form.setValue('displayName', selectedSize.description || selectedSize.slug);
    form.setValue('providerSizeSlug', selectedSize.slug);
    form.setValue('cpu', selectedSize.vcpus);
    form.setValue('memoryMb', selectedSize.memory);
    form.setValue('diskGb', selectedSize.disk);
    form.setValue('bandwidthTb', selectedSize.transfer);
    form.setValue('priceHourly', Math.round(selectedSize.price_hourly * 15000)); // Convert to IDR
    form.setValue('priceMonthly', Math.round(selectedSize.price_monthly * 15000));
    form.setValue('priceYearly', Math.round(selectedSize.price_monthly * 12 * 15000 * 0.85)); // 15% yearly discount

    setStep('configure-plan');
  };

  const handleBack = () => {
    setStep('select-size');
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await createPlan.mutateAsync(data);
    onOpenChange(false);
    resetDialog();
  });

  const resetDialog = () => {
    setStep('select-size');
    setSelectedSize(null);
    setSizeFilter('');
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'select-size' ? 'Pilih Size DigitalOcean' : 'Konfigurasi Paket'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select-size' && (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Cari size (slug, vCPU, memory)..."
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
              />
            </div>

            <div className="h-[400px] overflow-y-auto pr-4">
              {sizesLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : filteredSizes.length > 0 ? (
                <div className="space-y-3">
                  {filteredSizes.map((size) => (
                    <SizeCard
                      key={size.slug}
                      size={size}
                      selected={selectedSize?.slug === size.slug}
                      onClick={() => handleSelectSize(size)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tidak ada size yang ditemukan</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleContinue} disabled={!selectedSize}>
                Lanjutkan
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 'configure-plan' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="h-[400px] overflow-y-auto pr-4">
              <div className="space-y-4">
                {/* Selected Size Info */}
                {selectedSize && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <div className="text-sm font-medium mb-2">Size Terpilih</div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{selectedSize.description || selectedSize.slug}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedSize.vcpus} vCPU • {formatBytes(selectedSize.memory)} • {selectedSize.disk} GB SSD
                        </div>
                      </div>
                      <Badge>{formatPrice(selectedSize.price_monthly)}/mo</Badge>
                    </div>
                  </div>
                )}

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
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Kembali
              </Button>
              <Button type="submit" disabled={createPlan.isPending}>
                {createPlan.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Buat Paket
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
