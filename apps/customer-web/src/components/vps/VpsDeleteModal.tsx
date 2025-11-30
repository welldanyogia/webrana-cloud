'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Trash2, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VpsDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  isLoading?: boolean;
}

export function VpsDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
  isLoading,
}: VpsDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const expectedText = 'HAPUS';

  const isConfirmEnabled = confirmText === expectedText;

  // Handle modal close and reset state
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setConfirmText('');
      onClose();
    }
  }, [onClose]);

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-red-500">Hapus VPS</DialogTitle>
              <DialogDescription className="text-sm">
                Tindakan ini tidak dapat dibatalkan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-red-500">Peringatan!</p>
                <ul className="text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                  <li>Semua data pada VPS akan dihapus permanen</li>
                  <li>IP address akan dilepas dan tidak dapat dikembalikan</li>
                  <li>Tidak ada refund untuk sisa masa aktif</li>
                  <li>Backup tidak akan dibuat secara otomatis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* VPS Info */}
          <div className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">VPS yang akan dihapus:</p>
            <p className="font-semibold text-[var(--text-primary)]">{planName}</p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-delete" className="text-sm">
              Ketik <span className="font-mono font-bold text-red-500">{expectedText}</span> untuk
              konfirmasi
            </Label>
            <Input
              id="confirm-delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Ketik HAPUS"
              className="font-mono"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled || isLoading}
            isLoading={isLoading}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Hapus VPS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
