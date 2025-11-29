/**
 * Email Templates for Notification Service
 * 
 * Uses simple string interpolation for templates.
 * Consider migrating to Handlebars for more complex templates.
 */

export interface OrderCreatedData {
  orderNumber: string;
  customerName: string;
  planName: string;
  duration: number;
  durationUnit: string;
  basePrice: number;
  discount?: number;
  finalPrice: number;
  invoiceUrl?: string;
}

export interface PaymentConfirmedData {
  orderNumber: string;
  customerName: string;
  planName: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
}

export interface VpsActiveData {
  orderNumber: string;
  customerName: string;
  planName: string;
  ipAddress: string;
  hostname: string;
  username: string;
  password: string;
  osName: string;
  region: string;
  expiresAt: string;
}

export interface ProvisioningFailedData {
  orderNumber: string;
  customerName: string;
  planName: string;
  errorMessage: string;
  supportEmail?: string;
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
 * Base email wrapper
 */
function wrapInHtmlTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #333; color: #aaa; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; }
    .credentials { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .warning { color: #856404; }
    .success { color: #155724; }
    .error { color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f4f4f4; }
  </style>
</head>
<body>
  <div class="header">
    <h1>WeBrana Cloud</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} WeBrana Cloud. All rights reserved.</p>
    <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Order Created Email Template
 */
export function orderCreatedTemplate(data: OrderCreatedData): { subject: string; html: string; text: string } {
  const subject = `[WeBrana Cloud] Order Baru #${data.orderNumber}`;

  const html = wrapInHtmlTemplate(subject, `
    <h2>Hai ${data.customerName}! 👋</h2>
    <p>Terima kasih telah melakukan pemesanan di WeBrana Cloud. Berikut detail order Anda:</p>
    
    <div class="info-box">
      <h3>Detail Order</h3>
      <table>
        <tr><th>Order Number</th><td><strong>${data.orderNumber}</strong></td></tr>
        <tr><th>Paket</th><td>${data.planName}</td></tr>
        <tr><th>Durasi</th><td>${data.duration} ${data.durationUnit}</td></tr>
        <tr><th>Harga</th><td>${formatCurrency(data.basePrice)}</td></tr>
        ${data.discount ? `<tr><th>Diskon</th><td class="success">-${formatCurrency(data.discount)}</td></tr>` : ''}
        <tr><th>Total Pembayaran</th><td><strong>${formatCurrency(data.finalPrice)}</strong></td></tr>
      </table>
    </div>
    
    <p>Silakan lakukan pembayaran untuk mengaktifkan layanan VPS Anda.</p>
    
    ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="button">Bayar Sekarang</a>` : ''}
    
    <p class="warning">⚠️ Order akan otomatis dibatalkan jika tidak dibayar dalam 24 jam.</p>
  `);

  const text = `
Hai ${data.customerName}!

Terima kasih telah melakukan pemesanan di WeBrana Cloud.

Detail Order:
- Order Number: ${data.orderNumber}
- Paket: ${data.planName}
- Durasi: ${data.duration} ${data.durationUnit}
- Harga: ${formatCurrency(data.basePrice)}
${data.discount ? `- Diskon: -${formatCurrency(data.discount)}` : ''}
- Total Pembayaran: ${formatCurrency(data.finalPrice)}

Silakan lakukan pembayaran untuk mengaktifkan layanan VPS Anda.
${data.invoiceUrl ? `Link Pembayaran: ${data.invoiceUrl}` : ''}

Order akan otomatis dibatalkan jika tidak dibayar dalam 24 jam.

---
WeBrana Cloud
  `.trim();

  return { subject, html, text };
}

/**
 * Payment Confirmed Email Template
 */
export function paymentConfirmedTemplate(data: PaymentConfirmedData): { subject: string; html: string; text: string } {
  const subject = `[WeBrana Cloud] Pembayaran Berhasil - Order #${data.orderNumber}`;

  const html = wrapInHtmlTemplate(subject, `
    <h2>Pembayaran Berhasil! ✅</h2>
    <p>Hai ${data.customerName}, pembayaran untuk order Anda telah kami terima.</p>
    
    <div class="info-box">
      <h3>Detail Pembayaran</h3>
      <table>
        <tr><th>Order Number</th><td><strong>${data.orderNumber}</strong></td></tr>
        <tr><th>Paket</th><td>${data.planName}</td></tr>
        <tr><th>Jumlah</th><td><strong>${formatCurrency(data.amount)}</strong></td></tr>
        <tr><th>Metode Pembayaran</th><td>${data.paymentMethod}</td></tr>
        <tr><th>Waktu Pembayaran</th><td>${data.paidAt}</td></tr>
      </table>
    </div>
    
    <p class="success">✨ VPS Anda sedang dalam proses provisioning. Anda akan menerima email lagi setelah VPS siap digunakan.</p>
    
    <p>Proses ini biasanya memakan waktu 2-5 menit.</p>
  `);

  const text = `
Pembayaran Berhasil!

Hai ${data.customerName}, pembayaran untuk order Anda telah kami terima.

Detail Pembayaran:
- Order Number: ${data.orderNumber}
- Paket: ${data.planName}
- Jumlah: ${formatCurrency(data.amount)}
- Metode Pembayaran: ${data.paymentMethod}
- Waktu Pembayaran: ${data.paidAt}

VPS Anda sedang dalam proses provisioning. Anda akan menerima email lagi setelah VPS siap digunakan.

Proses ini biasanya memakan waktu 2-5 menit.

---
WeBrana Cloud
  `.trim();

  return { subject, html, text };
}

/**
 * VPS Active Email Template
 */
export function vpsActiveTemplate(data: VpsActiveData): { subject: string; html: string; text: string } {
  const subject = `[WeBrana Cloud] VPS Anda Siap! - Order #${data.orderNumber}`;

  const html = wrapInHtmlTemplate(subject, `
    <h2>VPS Anda Siap Digunakan! 🚀</h2>
    <p>Hai ${data.customerName}, VPS Anda telah berhasil dibuat dan siap digunakan.</p>
    
    <div class="info-box">
      <h3>Detail VPS</h3>
      <table>
        <tr><th>Order Number</th><td>${data.orderNumber}</td></tr>
        <tr><th>Paket</th><td>${data.planName}</td></tr>
        <tr><th>Hostname</th><td>${data.hostname}</td></tr>
        <tr><th>IP Address</th><td><strong>${data.ipAddress}</strong></td></tr>
        <tr><th>Sistem Operasi</th><td>${data.osName}</td></tr>
        <tr><th>Region</th><td>${data.region}</td></tr>
        <tr><th>Berlaku Sampai</th><td>${data.expiresAt}</td></tr>
      </table>
    </div>
    
    <div class="credentials">
      <h3>🔐 Kredensial Akses SSH</h3>
      <table>
        <tr><th>Username</th><td><code>${data.username}</code></td></tr>
        <tr><th>Password</th><td><code>${data.password}</code></td></tr>
      </table>
      <p class="warning"><strong>⚠️ PENTING:</strong> Segera ganti password setelah login pertama untuk keamanan!</p>
    </div>
    
    <h3>Cara Akses VPS</h3>
    <p>Gunakan SSH untuk mengakses VPS Anda:</p>
    <pre style="background: #333; color: #0f0; padding: 10px; border-radius: 5px;">ssh ${data.username}@${data.ipAddress}</pre>
    
    <p>Atau gunakan PuTTY (Windows) dengan konfigurasi:</p>
    <ul>
      <li>Host: <strong>${data.ipAddress}</strong></li>
      <li>Port: <strong>22</strong></li>
      <li>Username: <strong>${data.username}</strong></li>
    </ul>
    
    <p>Butuh bantuan? Hubungi support kami di <a href="mailto:support@webrana.id">support@webrana.id</a></p>
  `);

  const text = `
VPS Anda Siap Digunakan!

Hai ${data.customerName}, VPS Anda telah berhasil dibuat dan siap digunakan.

Detail VPS:
- Order Number: ${data.orderNumber}
- Paket: ${data.planName}
- Hostname: ${data.hostname}
- IP Address: ${data.ipAddress}
- Sistem Operasi: ${data.osName}
- Region: ${data.region}
- Berlaku Sampai: ${data.expiresAt}

Kredensial Akses SSH:
- Username: ${data.username}
- Password: ${data.password}

⚠️ PENTING: Segera ganti password setelah login pertama untuk keamanan!

Cara Akses VPS:
ssh ${data.username}@${data.ipAddress}

Butuh bantuan? Hubungi support kami di support@webrana.id

---
WeBrana Cloud
  `.trim();

  return { subject, html, text };
}

/**
 * Provisioning Failed Email Template
 */
export function provisioningFailedTemplate(data: ProvisioningFailedData): { subject: string; html: string; text: string } {
  const supportEmail = data.supportEmail || 'support@webrana.id';
  const subject = `[WeBrana Cloud] Gagal Provisioning - Order #${data.orderNumber}`;

  const html = wrapInHtmlTemplate(subject, `
    <h2 class="error">Provisioning Gagal ❌</h2>
    <p>Hai ${data.customerName}, mohon maaf, proses pembuatan VPS untuk order Anda mengalami kendala.</p>
    
    <div class="info-box">
      <h3>Detail Order</h3>
      <table>
        <tr><th>Order Number</th><td>${data.orderNumber}</td></tr>
        <tr><th>Paket</th><td>${data.planName}</td></tr>
        <tr><th>Error</th><td class="error">${data.errorMessage}</td></tr>
      </table>
    </div>
    
    <p>Tim teknis kami sedang menangani masalah ini. Anda akan mendapat notifikasi saat VPS berhasil dibuat.</p>
    
    <p>Jika dalam 24 jam tidak ada update, silakan hubungi kami di:</p>
    <a href="mailto:${supportEmail}" class="button">Hubungi Support</a>
    
    <p>Kami mohon maaf atas ketidaknyamanan ini.</p>
  `);

  const text = `
Provisioning Gagal

Hai ${data.customerName}, mohon maaf, proses pembuatan VPS untuk order Anda mengalami kendala.

Detail Order:
- Order Number: ${data.orderNumber}
- Paket: ${data.planName}
- Error: ${data.errorMessage}

Tim teknis kami sedang menangani masalah ini. Anda akan mendapat notifikasi saat VPS berhasil dibuat.

Jika dalam 24 jam tidak ada update, silakan hubungi kami di: ${supportEmail}

Kami mohon maaf atas ketidaknyamanan ini.

---
WeBrana Cloud
  `.trim();

  return { subject, html, text };
}
