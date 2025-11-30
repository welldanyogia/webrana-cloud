'use client';

import { useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={handleToggle}
        className={cn(
          'relative p-2 rounded-lg',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          'hover:bg-[var(--hover-bg)]',
          'transition-colors',
          isOpen && 'bg-[var(--hover-bg)] text-[var(--text-primary)]'
        )}
        aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Bell className="h-5 w-5" />
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5',
              'min-w-[18px] h-[18px] px-1',
              'flex items-center justify-center',
              'text-[10px] font-bold text-white',
              'bg-red-500 rounded-full',
              'animate-pulse'
            )}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown
        notifications={notifications}
        unreadCount={unreadCount}
        isConnected={isConnected}
        isLoading={isLoading}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClose={handleClose}
        isOpen={isOpen}
      />
    </div>
  );
}

export default NotificationBell;
