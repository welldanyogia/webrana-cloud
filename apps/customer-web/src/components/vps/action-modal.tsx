'use client';

import { X, AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { ACTION_LABELS } from '@/hooks/use-instances';
import { cn } from '@/lib/utils';
import type { InstanceActionType } from '@/types';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionType: InstanceActionType;
  hostname: string;
  isLoading?: boolean;
}

const ACTION_DESCRIPTIONS: Record<InstanceActionType, string> = {
  reboot: 'Server akan direstart dan tidak dapat diakses selama beberapa saat.',
  power_off: 'Server akan dimatikan dan tidak dapat diakses hingga dinyalakan kembali.',
  power_on: 'Server akan dinyalakan dan siap digunakan dalam beberapa saat.',
  reset_password: 'Password root akan direset. Password baru akan dikirim ke email Anda.',
};

const ACTION_CONFIRM_TEXT: Record<InstanceActionType, string> = {
  reboot: 'Ya, Restart Server',
  power_off: 'Ya, Matikan Server',
  power_on: 'Ya, Nyalakan Server',
  reset_password: 'Ya, Reset Password',
};

export function ActionModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  hostname,
  isLoading = false,
}: ActionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    // Focus the confirm button when modal opens
    confirmBtnRef.current?.focus();

    document.addEventListener('keydown', handleKeyDown);
    // Prevent scrolling
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const label = ACTION_LABELS[actionType];
  const description = ACTION_DESCRIPTIONS[actionType];
  const confirmText = ACTION_CONFIRM_TEXT[actionType];
  const isDangerous = actionType === 'power_off' || actionType === 'reset_password';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative bg-[var(--card-bg)] rounded-xl shadow-xl',
          'w-full max-w-md p-6',
          'border border-[var(--border)]',
          'animate-in fade-in-0 zoom-in-95'
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className={cn(
            'absolute top-4 right-4 p-1 rounded-lg',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--hover-bg)] transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center mb-4',
            isDangerous ? 'bg-[var(--error-bg)]' : 'bg-[var(--warning-bg)]'
          )}
        >
          <AlertTriangle
            className={cn(
              'h-6 w-6',
              isDangerous ? 'text-[var(--error)]' : 'text-[var(--warning)]'
            )}
          />
        </div>

        {/* Content */}
        <h2
          id="modal-title"
          className="text-lg font-semibold text-[var(--text-primary)] mb-2"
        >
          {label}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-2">
          Anda akan melakukan aksi <strong>{label.toLowerCase()}</strong> pada:
        </p>
        <p className="font-mono text-sm bg-[var(--surface)] px-3 py-2 rounded-lg mb-4 text-[var(--text-primary)]">
          {hostname}
        </p>
        <p className="text-sm text-[var(--text-muted)] mb-6">{description}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={isDangerous ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
