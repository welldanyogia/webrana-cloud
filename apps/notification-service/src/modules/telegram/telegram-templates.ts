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
