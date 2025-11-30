'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { deleteDoAccount, type DoAccount } from '@/lib/api/do-accounts';


interface DeleteAccountDialogProps {
  account: DoAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/**
 * Confirmation dialog for deleting a DO account
 * Requires typing the account name for safety
 */
export function DeleteAccountDialog({
  account,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === account.name;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      await deleteDoAccount(account.id);
      toast.success('DO account deleted successfully');
      onOpenChange(false);
      onDeleted();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An error occurred';
      toast.error(`Failed to delete account: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmText('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Delete DO Account</DialogTitle>
          </div>
          <DialogDescription className="pt-3">
            This action cannot be undone. This will permanently delete the
            DigitalOcean account &quot;<strong>{account.name}</strong>&quot; from
            the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {account.activeDroplets > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This account has{' '}
                {account.activeDroplets} active droplet(s). Make sure to
                migrate or delete them before removing this account.
              </p>
            </div>
          )}

          <div>
            <label
              htmlFor="confirmDelete"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Type <strong>{account.name}</strong> to confirm
            </label>
            <Input
              id="confirmDelete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter account name"
              disabled={isDeleting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
