'use client';

import {
  ArrowLeft,
  CreditCard,
  Wallet,
  QrCode,
  Store,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoiceByOrderId, usePaymentChannels, useInitiatePayment } from '@/hooks/use-billing';
import { useOrder } from '@/hooks/use-orders';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { PaymentChannel } from '@/types';

function getChannelIcon(type: string) {
  switch (type) {
    case 'virtual_account':
      return <CreditCard className="h-5 w-5" />;
    case 'ewallet':
      return <Wallet className="h-5 w-5" />;
    case 'qris':
      return <QrCode className="h-5 w-5" />;
    case 'convenience_store':
      return <Store className="h-5 w-5" />;
    default:
      return <CreditCard className="h-5 w-5" />;
  }
}

function getChannelGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    'Virtual Account': 'Transfer Bank (Virtual Account)',
    'E-Wallet': 'Dompet Digital',
    'QRIS': 'QRIS',
    'Convenience Store': 'Minimarket',
  };
  return labels[group] || group;
}

function groupChannels(channels: PaymentChannel[]): Record<string, PaymentChannel[]> {
  return channels.reduce((acc, channel) => {
    if (!acc[channel.group]) {
      acc[channel.group] = [];
    }
    acc[channel.group].push(channel);
    return acc;
  }, {} as Record<string, PaymentChannel[]>);
}

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

export default function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: invoice, isLoading: invoiceLoading } = useInvoiceByOrderId(orderId);
  const { data: channels, isLoading: channelsLoading } = usePaymentChannels();
  const initiatePayment = useInitiatePayment();

  const isLoading = orderLoading || invoiceLoading || channelsLoading;

  const handleSelectChannel = (code: string) => {
    setSelectedChannel(code);
  };

  const handleInitiatePayment = async () => {
    if (!selectedChannel || !invoice) {
      toast.error('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    try {
      const result = await initiatePayment.mutateAsync({
        invoiceId: invoice.id,
        data: {
          channel: selectedChannel,
          customerName: user?.name,
          customerEmail: user?.email,
          returnUrl: `${window.location.origin}/order/${orderId}`,
        },
      });

      toast.success('Pembayaran berhasil diinisiasi');
      
      // Navigate to instructions page with payment data
      router.push(`/order/${orderId}/payment/instructions?ref=${result.payment.paymentCode}`);
    } catch (error) {
      toast.error('Gagal memproses pembayaran. Silakan coba lagi.');
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!order || !invoice) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Invoice Tidak Ditemukan
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          Invoice untuk pesanan ini tidak ditemukan.
        </p>
        <Link href={`/order/${orderId}`}>
          <Button variant="outline">Kembali ke Detail Pesanan</Button>
        </Link>
      </div>
    );
  }

  if (invoice.status === 'PAID') {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Pembayaran Sudah Lunas
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          Invoice ini sudah dibayar. Lihat detail pesanan Anda.
        </p>
        <Link href={`/order/${orderId}`}>
          <Button>Lihat Detail Pesanan</Button>
        </Link>
      </div>
    );
  }

  const groupedChannels = channels ? groupChannels(channels) : {};
  const selectedChannelData = channels?.find(c => c.code === selectedChannel);
  const fee = selectedChannelData
    ? selectedChannelData.fee.flat + (invoice.amount * selectedChannelData.fee.percent / 100)
    : 0;
  const totalWithFee = invoice.amount + Math.ceil(fee);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <Link
        href={`/order/${orderId}`}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke Detail Pesanan
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)] mb-2">
          Pilih Metode Pembayaran
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Invoice: {invoice.invoiceNumber}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Channels */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(groupedChannels).map(([group, groupChannels]) => (
            <Card key={group}>
              <CardHeader className="pb-3">
                <CardTitle size="sm" className="flex items-center gap-2">
                  {getChannelIcon(groupChannels[0]?.type)}
                  {getChannelGroupLabel(group)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2">
                  {groupChannels.map((channel) => (
                    <button
                      key={channel.code}
                      onClick={() => handleSelectChannel(channel.code)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        selectedChannel === channel.code
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                          : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--card-bg)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {channel.iconUrl ? (
                          <img
                            src={channel.iconUrl}
                            alt={channel.name}
                            className="h-8 w-12 object-contain"
                          />
                        ) : (
                          <div className="h-8 w-12 bg-[var(--surface)] rounded flex items-center justify-center">
                            {getChannelIcon(channel.type)}
                          </div>
                        )}
                        <span className="font-medium text-[var(--text-primary)]">
                          {channel.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[var(--text-muted)]">
                          +{formatCurrency(channel.fee.flat + (invoice.amount * channel.fee.percent / 100))}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {!channels?.length && (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-[var(--warning)] mx-auto mb-4" />
                <p className="text-[var(--text-muted)]">
                  Tidak ada metode pembayaran yang tersedia saat ini.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Payment Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle size="sm">Ringkasan Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                {selectedChannel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--text-secondary)]">Biaya Admin</span>
                    <span className="text-[var(--text-primary)]">
                      {formatCurrency(Math.ceil(fee))}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-[var(--text-primary)]">Total</span>
                  <span className="font-bold text-lg text-[var(--primary)]">
                    {formatCurrency(selectedChannel ? totalWithFee : invoice.amount)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedChannel || initiatePayment.isPending}
                onClick={handleInitiatePayment}
              >
                {initiatePayment.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Bayar Sekarang'
                )}
              </Button>

              <p className="text-xs text-[var(--text-muted)] text-center">
                Dengan melanjutkan, Anda menyetujui syarat dan ketentuan pembayaran.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
