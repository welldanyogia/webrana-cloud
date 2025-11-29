/**
 * Utility function to conditionally join class names
 */
export function cn(
  ...inputs: (string | undefined | null | boolean | number)[]
): string {
  return inputs
    .filter((input): input is string => typeof input === 'string' && input !== '')
    .join(' ');
}

/**
 * Format currency to IDR format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;

  return formatDate(date);
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Get order status label in Indonesian
 */
export function getOrderStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING_PAYMENT: 'Menunggu Pembayaran',
    PAYMENT_RECEIVED: 'Pembayaran Diterima',
    PROVISIONING: 'Sedang Diproses',
    ACTIVE: 'Aktif',
    FAILED: 'Gagal',
    CANCELLED: 'Dibatalkan',
    EXPIRED: 'Kadaluarsa',
  };
  return statusMap[status] || status;
}

/**
 * Get order status color for styling
 */
export function getOrderStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING_PAYMENT: 'text-amber-600 bg-amber-50',
    PAYMENT_RECEIVED: 'text-blue-600 bg-blue-50',
    PROVISIONING: 'text-blue-600 bg-blue-50',
    ACTIVE: 'text-emerald-600 bg-emerald-50',
    FAILED: 'text-red-600 bg-red-50',
    CANCELLED: 'text-gray-600 bg-gray-50',
    EXPIRED: 'text-gray-600 bg-gray-50',
  };
  return colorMap[status] || 'text-gray-600 bg-gray-50';
}
