import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import { Providers } from './providers';
import './globals.css';

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
    <html 
      lang="id" 
      className={`${GeistSans.variable} ${GeistMono.variable} dark`} 
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
