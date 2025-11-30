/**
 * Telegram Message Templates
 * 
 * Uses Telegram MarkdownV2 formatting
 * Reference: https://core.telegram.org/bots/api#markdownv2-style
 */

export interface PaymentConfirmedTelegramData {
  orderNumber: string;
  planName: string;
  amount: number;
  paidAt: string;
}

export interface VpsActiveTelegramData {
  orderNumber: string;
  planName: string;
  ipAddress: string;
  hostname: string;
  username: string;
  password: string;
  expiresAt: string;
}

export interface ProvisioningFailedTelegramData {
  orderNumber: string;
  planName: string;
  errorMessage: string;
}

export interface VpsExpiringSoonTelegramData {
  orderId: string;
  planName: string;
  expiresAt: string;
  hoursRemaining: number;
  autoRenew: boolean;
}

export interface VpsSuspendedTelegramData {
  orderId: string;
  planName: string;
  suspendedAt: string;
  gracePeriodHours: number;
}

export interface VpsDestroyedTelegramData {
  orderId: string;
  planName: string;
  reason: string;
  terminatedAt: string;
}

export interface RenewalSuccessTelegramData {
  orderId: string;
  planName: string;
  newExpiry: string;
  amount: number;
}

export interface RenewalFailedTelegramData {
  orderId: string;
  planName: string;
  required: number;
}

/**
 * Format currency to IDR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Escape special characters for Telegram MarkdownV2
 */
function escapeMarkdownV2(text: string): string {
  // eslint-disable-next-line no-useless-escape
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

/**
 * Payment Confirmed Telegram Template
 */
export function paymentConfirmedTelegramTemplate(data: PaymentConfirmedTelegramData): string {
  return `
✅ *Pembayaran Berhasil\\!*

Order: \`${escapeMarkdownV2(data.orderNumber)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Jumlah: *${escapeMarkdownV2(formatCurrency(data.amount))}*
Waktu: ${escapeMarkdownV2(data.paidAt)}

VPS Anda sedang dalam proses provisioning\\. Anda akan menerima notifikasi lagi setelah VPS siap\\.
  `.trim();
}

/**
 * VPS Active Telegram Template
 */
export function vpsActiveTelegramTemplate(data: VpsActiveTelegramData): string {
  return `
🚀 *VPS Anda Siap Digunakan\\!*

📋 *Detail VPS*
Order: \`${escapeMarkdownV2(data.orderNumber)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Hostname: \`${escapeMarkdownV2(data.hostname)}\`

🌐 *Akses Server*
IP Address: \`${escapeMarkdownV2(data.ipAddress)}\`
Username: \`${escapeMarkdownV2(data.username)}\`
Password: \`${escapeMarkdownV2(data.password)}\`

⏰ Berlaku sampai: ${escapeMarkdownV2(data.expiresAt)}

⚠️ *PENTING:* Segera ganti password setelah login pertama\\!

📖 Cara akses:
\`\`\`
ssh ${escapeMarkdownV2(data.username)}@${escapeMarkdownV2(data.ipAddress)}
\`\`\`
  `.trim();
}

/**
 * Provisioning Failed Telegram Template
 */
export function provisioningFailedTelegramTemplate(data: ProvisioningFailedTelegramData): string {
  return `
❌ *Provisioning Gagal*

Order: \`${escapeMarkdownV2(data.orderNumber)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Error: ${escapeMarkdownV2(data.errorMessage)}

Tim teknis kami sedang menangani masalah ini\\. Anda akan mendapat notifikasi saat VPS berhasil dibuat\\.

Hubungi support jika butuh bantuan: support@webrana\\.id
  `.trim();
}

/**
 * VPS Expiring Soon Telegram Template
 */
export function vpsExpiringSoonTelegramTemplate(data: VpsExpiringSoonTelegramData): string {
  const urgencyEmoji = data.hoursRemaining <= 8 ? '🚨' : '⚠️';
  return `
${urgencyEmoji} *VPS Akan Berakhir\\!*

Order: \`${escapeMarkdownV2(data.orderId)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Berakhir: *${escapeMarkdownV2(data.expiresAt)}*
Sisa waktu: *${data.hoursRemaining} jam*
Auto\\-Renew: ${data.autoRenew ? '✅ Aktif' : '❌ Tidak Aktif'}

${data.autoRenew 
  ? 'Auto\\-renewal aktif\\. Pastikan saldo Anda mencukupi\\.'
  : '*Perpanjang sekarang untuk menghindari penonaktifan\\!*'
}
  `.trim();
}

/**
 * VPS Suspended Telegram Template
 */
export function vpsSuspendedTelegramTemplate(data: VpsSuspendedTelegramData): string {
  return `
🔴 *VPS Telah Disuspend*

Order: \`${escapeMarkdownV2(data.orderId)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Disuspend: ${escapeMarkdownV2(data.suspendedAt)}
Grace Period: *${data.gracePeriodHours} jam*

⚠️ *PENTING:*
VPS akan *dihapus permanen* dalam ${data.gracePeriodHours} jam jika tidak diperpanjang\\!

Perpanjang sekarang di dashboard Anda\\.
  `.trim();
}

/**
 * VPS Destroyed Telegram Template
 */
export function vpsDestroyedTelegramTemplate(data: VpsDestroyedTelegramData): string {
  return `
VPS Telah Dihapus

Order: \`${escapeMarkdownV2(data.orderId)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Alasan: ${escapeMarkdownV2(getDestroyReasonTextTelegram(data.reason))}
Dihapus: ${escapeMarkdownV2(data.terminatedAt)}

Terima kasih telah menggunakan WeBrana Cloud\\.
  `.trim();
}

/**
 * Helper function to translate termination reason for Telegram
 */
function getDestroyReasonTextTelegram(reason: string): string {
  switch (reason) {
    case 'EXPIRED_NO_RENEWAL':
      return 'Masa berlaku habis';
    case 'INSUFFICIENT_BALANCE':
      return 'Saldo tidak cukup';
    case 'USER_DELETED':
      return 'Dihapus pengguna';
    case 'ADMIN_TERMINATED':
      return 'Dihapus admin';
    case 'DO_ACCOUNT_ISSUE':
      return 'Masalah DO account';
    case 'POLICY_VIOLATION':
      return 'Pelanggaran kebijakan';
    default:
      return reason;
  }
}

/**
 * Renewal Success Telegram Template
 */
export function renewalSuccessTelegramTemplate(data: RenewalSuccessTelegramData): string {
  return `
✅ *Perpanjangan Berhasil\\!*

Order: \`${escapeMarkdownV2(data.orderId)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Biaya: *${escapeMarkdownV2(formatCurrency(data.amount))}*
Berlaku sampai: *${escapeMarkdownV2(data.newExpiry)}*

VPS Anda akan terus berjalan tanpa gangguan\\. 🚀
  `.trim();
}

/**
 * Renewal Failed Telegram Template
 */
export function renewalFailedTelegramTemplate(data: RenewalFailedTelegramData): string {
  return `
❌ *Perpanjangan Gagal*

Order: \`${escapeMarkdownV2(data.orderId)}\`
Paket: ${escapeMarkdownV2(data.planName)}
Saldo dibutuhkan: *${escapeMarkdownV2(formatCurrency(data.required))}*

⚠️ *Segera top up saldo Anda\\!*
VPS akan disuspend/dihapus jika tidak diperpanjang\\.
  `.trim();
}
