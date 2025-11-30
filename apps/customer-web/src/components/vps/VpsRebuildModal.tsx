'use client';

import { useState } from 'react';
import { RefreshCw, AlertTriangle, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useCatalog } from '@/hooks/use-catalog';

interface VpsRebuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (imageId: string) => void;
  currentImageId: string;
  isLoading?: boolean;
}

export function VpsRebuildModal({
  isOpen,
  onClose,
  onConfirm,
  currentImageId,
  isLoading,
}: VpsRebuildModalProps) {
  const [selectedImageId, setSelectedImageId] = useState<string>(currentImageId);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const { data: catalogData, isLoading: isCatalogLoading } = useCatalog();
  const images = catalogData?.images ?? [];

  // Handle modal open change - reset state when opening
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedImageId(currentImageId);
      setConfirmChecked(false);
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedImageId && confirmChecked) {
      onConfirm(selectedImageId);
    }
  };

  // Group images by distribution
  const groupedImages = images.reduce(
    (acc, image) => {
      const dist = image.distribution || 'Other';
      if (!acc[dist]) {
        acc[dist] = [];
      }
      acc[dist].push(image);
      return acc;
    },
    {} as Record<string, typeof images>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle>Rebuild VPS</DialogTitle>
              <DialogDescription className="text-sm">
                Pilih sistem operasi untuk install ulang
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-500">
                <span className="font-semibold">Peringatan:</span> Semua data di disk akan
                dihapus. Pastikan Anda sudah backup data penting.
              </p>
            </div>
          </div>

          {/* OS Selection */}
          <div className="space-y-2">
            <Label className="text-sm">Pilih Sistem Operasi</Label>

            {isCatalogLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-4 pr-2">
                {Object.entries(groupedImages).map(([distribution, distImages]) => (
                  <div key={distribution}>
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                      {distribution}
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {distImages.map((image) => (
                        <button
                          key={image.id}
                          type="button"
                          onClick={() => setSelectedImageId(image.id)}
                          className={cn(
                            'flex items-center justify-between rounded-lg border p-3 text-left transition-all',
                            selectedImageId === image.id
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-[var(--surface)] flex items-center justify-center">
                              <span className="text-xs font-bold text-[var(--text-muted)]">
                                {distribution.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--text-primary)]">
                                {image.name}
                              </p>
                              <p className="text-xs text-[var(--text-muted)]">
                                {image.version}
                              </p>
                            </div>
                          </div>
                          {selectedImageId === image.id && (
                            <Check className="h-5 w-5 text-[var(--primary)]" />
                          )}
                          {currentImageId === image.id && selectedImageId !== image.id && (
                            <span className="text-xs text-[var(--text-muted)]">Current</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--text-secondary)]">
              Saya mengerti bahwa semua data akan dihapus dan proses ini tidak dapat
              dibatalkan.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            variant="warning"
            onClick={handleConfirm}
            disabled={!selectedImageId || !confirmChecked || isLoading}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Rebuild VPS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
