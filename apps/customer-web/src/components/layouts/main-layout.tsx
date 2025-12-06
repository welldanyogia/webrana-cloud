'use client';

import {
  LayoutDashboard,
  Server,
  ShoppingCart,
  FileText,
  User,
  Menu,
  LogOut,
  ChevronDown,
  Cloud,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { NotificationBell } from '@/components/notifications';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLogout } from '@/hooks/use-auth';
import { useWalletBalance } from '@/hooks/use-wallet';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Beli VPS', href: '/catalog', icon: ShoppingCart },
  { name: 'VPS Saya', href: '/vps', icon: Server },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Tagihan', href: '/invoices', icon: FileText },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();
  const { data: walletData, isLoading: isLoadingWallet } = useWalletBalance();

  const handleLogout = () => {
    logout.mutate();
    setSheetOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header - Fixed Top Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--card-bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            {/* Left: Brand */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <Cloud className="h-4 w-4 text-white" />
                </div>
                <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                  Webrana
                </span>
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'text-[var(--text-primary)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                      {isActive && (
                        <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-[var(--primary)] rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right: User Menu */}
            <div className="flex items-center gap-1">
              {/* Wallet Balance - Desktop */}
              <Link
                href="/wallet"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--primary-muted)] hover:bg-[var(--primary-muted)]/80 transition-colors mr-1"
                data-testid="header-wallet-balance"
              >
                <Wallet className="h-4 w-4 text-[var(--primary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {isLoadingWallet ? '...' : formatCurrency(walletData?.balance ?? 0)}
                </span>
                <span className="h-6 px-2 text-xs bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-md inline-flex items-center justify-center font-medium">
                  Top Up
                </span>
              </Link>

              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Dropdown - Desktop */}
              <div className="relative ml-2 hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] max-w-[100px] truncate">
                    {user?.name || 'User'}
                  </span>
                  <ChevronDown className={cn(
                    "h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200",
                    userMenuOpen && "rotate-180"
                  )} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-[var(--dropdown-bg)] rounded-xl shadow-lg border border-[var(--border)] py-1 z-20 animate-scaleIn origin-top-right">
                      <div className="px-4 py-3 border-b border-[var(--border)]">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                          {user?.email}
                        </p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Profil Saya
                        </Link>
                      </div>
                      <div className="border-t border-[var(--border)] py-1">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] w-full text-left transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Keluar
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Menu (Sheet) */}
              <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden ml-1">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
                  <SheetHeader className="px-6 py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                        <Cloud className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                        Webrana Cloud
                      </span>
                    </div>
                  </SheetHeader>
                  
                  <div className="px-4 py-4 space-y-6 h-[calc(100vh-80px)] overflow-y-auto">
                    {/* Wallet Info (Mobile Only) */}
                    <div className="bg-[var(--primary-muted)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-[var(--text-muted)]">Saldo Wallet</span>
                        <Wallet className="h-4 w-4 text-[var(--primary)]" />
                      </div>
                      <div className="text-xl font-bold text-[var(--text-primary)] mb-3">
                        {isLoadingWallet ? '...' : formatCurrency(walletData?.balance ?? 0)}
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
                        asChild
                      >
                        <Link href="/wallet" onClick={() => setSheetOpen(false)}>
                          Top Up Saldo
                        </Link>
                      </Button>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-1">
                      <p className="px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Menu
                      </p>
                      {navigation.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setSheetOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-[var(--primary-muted)] text-[var(--primary)]'
                                : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>

                    <Separator />

                    {/* User Profile */}
                    <div className="space-y-1">
                      <p className="px-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">
                        Akun
                      </p>
                      <div className="flex items-center gap-3 px-3 py-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white text-sm font-semibold">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                      
                      <Link
                        href="/profile"
                        onClick={() => setSheetOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]"
                      >
                        <User className="h-4 w-4" />
                        Profil Saya
                      </Link>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--error)] hover:bg-[var(--error-bg)] w-full text-left transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Keluar
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-14">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card-bg)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} Webrana Cloud. All rights reserved.
            </span>
            <div className="flex items-center gap-5">
              <Link
                href="/terms"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Syarat & Ketentuan
              </Link>
              <Link
                href="/privacy"
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Kebijakan Privasi
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
