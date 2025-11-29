import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel - WeBrana Cloud',
    template: '%s | Admin Panel - WeBrana Cloud',
  },
  description:
    'Admin dashboard untuk platform VPS hosting WeBrana Cloud.',
  keywords: ['admin', 'dashboard', 'VPS', 'hosting', 'WeBrana'],
  authors: [{ name: 'WeBrana' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[var(--background)] text-[var(--text-primary)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
