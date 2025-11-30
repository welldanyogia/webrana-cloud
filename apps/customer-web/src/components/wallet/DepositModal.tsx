'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/hooks/use-wallet';
import { usePaymentChannels } from '@/hooks/use-billing';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';
import type { PaymentChannel } from '@/types';

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000];
const MIN_AMOUNT = 10000;

interface DepositModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal component for creating wallet deposits
 */
export function DepositModal({ open, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const { createDeposit, isCreatingDeposit } = useWallet();
  const { data: channels, isLoading: isLoadingChannels } = usePaymentChannels();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    }
  };

  const handleSubmit = async () => {
    if (!amount || amount < MIN_AMOUNT) {
      toast.error(`Minimal top up ${formatCurrency(MIN_AMOUNT)}`);
      return;
    }

    if (!paymentMethod) {
      toast.error('Pilih metode pembayaran');
      return;
    }

    try {
      await createDeposit({ amount, paymentMethod });
      toast.success('Deposit berhasil dibuat! Silakan selesaikan pembayaran.');

      // Reset form and close modal
      setAmount(100000);
      setPaymentMethod('');
      onClose();
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError?.response?.data?.error?.message || 'Gagal membuat deposit';
      toast.error(message);
    }
  };

  const handleClose = () => {
    if (!isCreatingDeposit) {
      setAmount(100000);
      setPaymentMethod('');
      onClose();
    }
  };

  // Group payment channels by type
  const groupedChannels = groupChannelsByType(channels || []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Top Up Saldo
          </DialogTitle>
          <DialogDescription>
            Isi saldo wallet Anda untuk mempermudah pembayaran VPS
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="deposit-amount">Jumlah Top Up</Label>
            <Input
              id="deposit-amount"
              type="number"
              value={amount}
              onChange={handleAmountChange}
              min={MIN_AMOUNT}
              step={10000}
              placeholder={`Min. ${formatCurrency(MIN_AMOUNT)}`}
              data-testid="deposit-amount-input"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(preset)}
                  data-testid={`preset-amount-${preset}`}
                >
                  {formatCompactCurrency(preset)}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            {isLoadingChannels ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedChannels).map(([group, groupChannels]) => (
                  <div key={group} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {group}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {groupChannels.map((channel) => (
                        <Button
                          key={channel.code}
                          type="button"
                          variant={paymentMethod === channel.code ? 'default' : 'outline'}
                          className={cn(
                            'justify-start h-auto py-2 px-3',
                            paymentMethod === channel.code && 'ring-2 ring-primary'
                          )}
                          onClick={() => setPaymentMethod(channel.code)}
                          data-testid={`payment-method-${channel.code}`}
                        >
                          <span className="text-sm truncate">{channel.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Jumlah Top Up</span>
              <span className="font-medium">{formatCurrency(amount)}</span>
            </div>
            {/* Placeholder for bonus display */}
            {/* <div className="flex justify-between text-sm text-emerald-600">
              <span>Bonus</span>
              <span>+{formatCurrency(0)}</span>
            </div> */}
            <div className="flex justify-between pt-2 border-t font-bold">
              <span>Total Kredit</span>
              <span>{formatCurrency(amount)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isCreatingDeposit || !amount || amount < MIN_AMOUNT || !paymentMethod}
            className="w-full"
            data-testid="submit-deposit"
          >
            {isCreatingDeposit ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              'Lanjut ke Pembayaran'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format currency in compact form (e.g., 50rb, 100rb)
 */
function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${amount / 1000000}jt`;
  }
  if (amount >= 1000) {
    return `${amount / 1000}rb`;
  }
  return amount.toString();
}

/**
 * Group payment channels by their type/group
 */
function groupChannelsByType(channels: PaymentChannel[]): Record<string, PaymentChannel[]> {
  const groups: Record<string, PaymentChannel[]> = {};

  channels.forEach((channel) => {
    const group = channel.group || 'Lainnya';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(channel);
  });

  return groups;
}
