import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'WeBrana Cloud - VPS Hosting Indonesia',
    template: '%s | WeBrana Cloud',
  },
  description:
    'Platform VPS hosting terpercaya di Indonesia. Pesan VPS dengan mudah, bayar dengan berbagai metode pembayaran.',
  keywords: ['VPS', 'hosting', 'cloud', 'server', 'Indonesia', 'WeBrana'],
  authors: [{ name: 'WeBrana' }],
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: 'https://webrana.cloud',
    siteName: 'WeBrana Cloud',
    title: 'WeBrana Cloud - VPS Hosting Indonesia',
    description:
      'Platform VPS hosting terpercaya di Indonesia. Pesan VPS dengan mudah, bayar dengan berbagai metode pembayaran.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
