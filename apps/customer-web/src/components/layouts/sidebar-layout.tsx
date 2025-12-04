'use client';

import {
  LayoutDashboard,
  Server,
  ShoppingCart,
  FileText,
  User,
  Menu,
  LogOut,
  Wallet,
  Settings,
  LifeBuoy,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import { NotificationBell } from '@/components/notifications';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useLogout } from '@/hooks/use-auth';
import { useWalletBalance } from '@/hooks/use-wallet';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Beli VPS', href: '/catalog', icon: ShoppingCart },
  { name: 'VPS Saya', href: '/vps', icon: Server },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Tagihan', href: '/invoices', icon: FileText },
];

const secondaryNavigation: NavigationItem[] = [
  { name: 'Pengaturan', href: '/settings', icon: Settings },
  { name: 'Bantuan', href: '/support', icon: LifeBuoy },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();
  const logout = useLogout();
  const { data: walletData, isLoading: isLoadingWallet } = useWalletBalance();

  const handleLogout = () => {
    logout.mutate();
  };

  // Vercel-style navigation item - minimal, high contrast on active
  const NavItem = ({ item, mobile = false }: { item: NavigationItem, mobile?: boolean }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={() => mobile && setMobileOpen(false)}
        className={cn(
          'group flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
          isActive
            ? 'bg-secondary text-foreground font-medium'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
          mobile ? 'w-full' : ''
        )}
      >
        <item.icon className={cn(
          "h-4 w-4 transition-colors",
          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
        )} />
        {item.name}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar - Vercel style: clean black sidebar with subtle border */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-background fixed inset-y-0 left-0 z-50">
        {/* Logo Area */}
        <div className="h-14 flex items-center px-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* Vercel-style logo: simple, bold */}
            <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-sm">W</span>
            </div>
            <span className="text-sm font-semibold text-foreground tracking-tight">
              Webrana
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-y-auto py-4 px-2 gap-4">
          <div className="space-y-0.5">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>

          <div className="space-y-0.5 mt-auto pt-4 border-t border-border">
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        </div>

        {/* User Profile Snippet (Bottom) - Vercel style: minimal */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:pl-60 flex flex-col min-h-screen">
        {/* Top Header - Vercel style: clean, no blur, subtle border */}
        <header className="h-14 border-b border-border bg-background sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden -ml-2 h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0 bg-background border-border">
                <div className="h-14 flex items-center px-4 border-b border-border">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-foreground flex items-center justify-center">
                      <span className="text-background font-bold text-sm">W</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">Webrana</span>
                  </Link>
                </div>
                <div className="py-4 px-2 space-y-4">
                  <div className="space-y-0.5">
                    {navigation.map((item) => (
                      <NavItem key={item.name} item={item} mobile />
                    ))}
                  </div>
                  <div className="space-y-0.5 pt-4 border-t border-border">
                    {secondaryNavigation.map((item) => (
                      <NavItem key={item.name} item={item} mobile />
                    ))}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Breadcrumbs - Vercel style: simple chevron separator */}
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
              <span className="hover:text-foreground transition-colors cursor-pointer">Console</span>
              <ChevronRight className="h-3.5 w-3.5 mx-1" />
              <span className="text-foreground">
                {navigation.find(n => n.href === pathname)?.name || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Wallet Status - Vercel style: pill with subtle background */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border text-sm">
              <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium tabular-nums">
                {isLoadingWallet ? '...' : formatCurrency(walletData?.balance ?? 0)}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 px-2 text-xs bg-foreground text-background hover:bg-foreground/90 hover:text-background rounded" 
                asChild
              >
                <Link href="/wallet">Top Up</Link>
              </Button>
            </div>

            <ThemeToggle />
            <NotificationBell />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="bg-secondary text-foreground text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card border-border" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil Saya</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/wallet">
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>Billing & Wallet</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer" 
                  onClick={() => handleLogout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
