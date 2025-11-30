'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Copy, Check, Key, AlertTriangle, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostname: string;
  /** If password is provided, display it. Otherwise show email notification message. */
  password?: string | null;
}

export function PasswordModal({
  isOpen,
  onClose,
  hostname,
  password,
}: PasswordModalProps) {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Note: copied state will be reset when modal is closed via the setTimeout in copyToClipboard
  // No need for additional reset logic

  const copyToClipboard = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    toast.success('Password berhasil disalin');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

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
        onClick={onClose}
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
          className={cn(
            'absolute top-4 right-4 p-1 rounded-lg',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--hover-bg)] transition-colors'
          )}
          aria-label="Tutup"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 bg-[var(--success-bg)] rounded-full flex items-center justify-center mb-4">
          {password ? (
            <Key className="h-6 w-6 text-[var(--success)]" />
          ) : (
            <Mail className="h-6 w-6 text-[var(--success)]" />
          )}
        </div>

        {/* Content */}
        <h2
          id="modal-title"
          className="text-lg font-semibold text-[var(--text-primary)] mb-2"
        >
          Password Berhasil Direset
        </h2>

        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Password root untuk <strong className="font-mono">{hostname}</strong> telah direset.
        </p>

        {password ? (
          <>
            {/* Warning */}
            <div className="flex items-start gap-2 mb-4 p-3 bg-[var(--warning-bg)] rounded-lg">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[var(--warning)]">
                Simpan password ini sekarang! Password hanya ditampilkan satu kali dan tidak dapat dilihat lagi.
              </p>
            </div>

            {/* Password Display */}
            <div className="mb-6">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">
                Password Baru
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-[var(--surface)] px-3 py-2 rounded-lg text-[var(--text-primary)] select-all">
                  {password}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  title="Salin password"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)]">
              Password baru akan dikirim ke alamat email yang terdaftar di akun DigitalOcean Anda.
              Silakan periksa inbox email Anda.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button onClick={onClose}>
            {password ? 'Sudah Disimpan' : 'Tutup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
