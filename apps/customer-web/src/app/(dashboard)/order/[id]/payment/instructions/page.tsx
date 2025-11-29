'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Copy,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoiceByOrderId, useInvoicePolling } from '@/hooks/use-billing';
import { formatCurrency, formatDate } from '@/lib/utils';

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} berhasil disalin`);
}

function CountdownTimer({ expiredAt }: { expiredAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiredAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [expiredAt]);

  return (
    <div className={`text-center p-4 rounded-lg ${isExpired ? 'bg-[var(--error-bg)]' : 'bg-[var(--warning-bg)]'}`}>
      <div className="flex items-center justify-center gap-2 mb-1">
        <Clock className={`h-4 w-4 ${isExpired ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`} />
        <span className={`text-sm font-medium ${isExpired ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`}>
          {isExpired ? 'Pembayaran Kadaluarsa' : 'Sisa Waktu Pembayaran'}
        </span>
      </div>
      <span className={`text-2xl font-bold font-mono ${isExpired ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
        {timeLeft}
      </span>
    </div>
  );
}

function InstructionsAccordion({ instructions }: { instructions?: { title: string; steps: string[] }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!instructions?.length) return null;

  return (
    <div className="space-y-2">
      {instructions.map((instruction, index) => (
        <div key={index} className="border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--hover-bg)] transition-colors"
          >
            <span className="font-medium text-[var(--text-primary)]">{instruction.title}</span>
            {openIndex === index ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
            )}
          </button>
          {openIndex === index && (
            <div className="px-4 pb-4">
              <ol className="list-decimal list-inside space-y-2">
                {instruction.steps.map((step, stepIndex) => (
                  <li key={stepIndex} className="text-sm text-[var(--text-secondary)]">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export default function PaymentInstructionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orderId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get('ref');

  const { data: invoice, isLoading } = useInvoiceByOrderId(orderId);
  const { data: polledInvoice } = useInvoicePolling(
    invoice?.id || '',
    invoice?.status === 'PENDING'
  );

  // Use polled data if available
  const currentInvoice = polledInvoice || invoice;

  // Redirect if payment is confirmed
  useEffect(() => {
    if (currentInvoice?.status === 'PAID') {
      toast.success('Pembayaran berhasil dikonfirmasi!');
      router.push(`/order/${orderId}`);
    }
  }, [currentInvoice?.status, orderId, router]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!currentInvoice) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
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

  if (currentInvoice.status === 'PAID') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[var(--success-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Pembayaran Berhasil!
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          Pembayaran Anda telah dikonfirmasi. VPS Anda akan segera diproses.
        </p>
        <Link href={`/order/${orderId}`}>
          <Button>Lihat Detail Pesanan</Button>
        </Link>
      </div>
    );
  }

  if (currentInvoice.status === 'EXPIRED') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-[var(--error-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          Pembayaran Kadaluarsa
        </h2>
        <p className="text-[var(--text-muted)] mb-6">
          Waktu pembayaran telah habis. Silakan buat pesanan baru.
        </p>
        <Link href="/catalog">
          <Button>Buat Pesanan Baru</Button>
        </Link>
      </div>
    );
  }

  const paymentCode = currentInvoice.paymentCode || paymentRef || '';
  const isQris = currentInvoice.paymentChannel?.includes('QRIS');

  return (
    <div className="max-w-2xl mx-auto">
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
        <div className="flex items-center gap-3 mb-2">
          <Loader2 className="h-6 w-6 text-[var(--warning)] animate-spin" />
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Menunggu Pembayaran
          </h1>
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          Invoice: {currentInvoice.invoiceNumber}
        </p>
      </div>

      <div className="space-y-6">
        {/* Countdown */}
        {currentInvoice.expiredAt && (
          <CountdownTimer expiredAt={currentInvoice.expiredAt} />
        )}

        {/* Payment Info */}
        <Card>
          <CardHeader>
            <CardTitle size="sm" className="flex items-center justify-between">
              <span>Informasi Pembayaran</span>
              <Badge variant="warning">Menunggu</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Payment Method */}
            {currentInvoice.paymentName && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Metode Pembayaran</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {currentInvoice.paymentName}
                </span>
              </div>
            )}

            {/* Payment Code / VA Number */}
            {paymentCode && !isQris && (
              <div className="bg-[var(--surface)] rounded-lg p-4">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                  {currentInvoice.paymentChannel?.includes('VA') ? 'Nomor Virtual Account' : 'Kode Pembayaran'}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <code className="text-xl font-bold font-mono text-[var(--text-primary)] tracking-wider">
                    {paymentCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(paymentCode, 'Kode pembayaran')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Salin
                  </Button>
                </div>
              </div>
            )}

            {/* QRIS */}
            {isQris && currentInvoice.paymentUrl && (
              <div className="text-center">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  Scan QR Code di bawah dengan aplikasi e-wallet Anda
                </p>
                <div className="inline-block bg-white p-4 rounded-lg border border-[var(--border)]">
                  <img
                    src={currentInvoice.paymentUrl}
                    alt="QRIS Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Total Amount */}
            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-secondary)]">Total Pembayaran</span>
                <span className="text-xl font-bold text-[var(--primary)]">
                  {formatCurrency(currentInvoice.amount + (currentInvoice.paymentFee || 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        <Card>
          <CardHeader>
            <CardTitle size="sm">Cara Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Default instructions if no custom instructions */}
            <div className="space-y-2">
              <div className="border border-[var(--border)] rounded-lg p-4">
                <h4 className="font-medium text-[var(--text-primary)] mb-2">Langkah Pembayaran</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>Salin nomor virtual account atau kode pembayaran di atas</li>
                  <li>Buka aplikasi mobile banking atau e-wallet Anda</li>
                  <li>Pilih menu transfer atau pembayaran</li>
                  <li>Masukkan nomor VA atau kode pembayaran</li>
                  <li>Pastikan nama dan jumlah sudah benar</li>
                  <li>Konfirmasi dan selesaikan pembayaran</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Check */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-[var(--text-muted)] animate-spin" />
                <span className="text-sm text-[var(--text-muted)]">
                  Status pembayaran diperbarui otomatis
                </span>
              </div>
              {currentInvoice.paymentUrl && !isQris && (
                <a
                  href={currentInvoice.paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    Buka Halaman Pembayaran
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
