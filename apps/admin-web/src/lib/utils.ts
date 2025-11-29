import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date);
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} hari yang lalu`;
  if (hours > 0) return `${hours} jam yang lalu`;
  if (minutes > 0) return `${minutes} menit yang lalu`;
  return 'Baru saja';
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: 'Menunggu Pembayaran',
    payment_received: 'Pembayaran Diterima',
    provisioning: 'Sedang Diproses',
    active: 'Aktif',
    suspended: 'Ditangguhkan',
    cancelled: 'Dibatalkan',
    expired: 'Kedaluwarsa',
  };
  return labels[status] || status;
}

export function getOrderStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending_payment: 'warning',
    payment_received: 'info',
    provisioning: 'info',
    active: 'success',
    suspended: 'danger',
    cancelled: 'danger',
    expired: 'danger',
    PENDING_PAYMENT: 'warning',
    PAYMENT_RECEIVED: 'info',
    PROVISIONING: 'info',
    ACTIVE: 'success',
    SUSPENDED: 'danger',
    CANCELLED: 'danger',
    EXPIRED: 'danger',
  };
  return variants[status] || 'outline';
}
