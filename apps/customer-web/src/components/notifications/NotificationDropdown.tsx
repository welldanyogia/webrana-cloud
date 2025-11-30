'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { CheckCheck, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationItem } from './NotificationItem';
import { NotificationEmpty } from './NotificationEmpty';
import { Button } from '@/components/ui/button';
import type { Notification } from '@/types';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading?: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  isConnected,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
  isOpen,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Add delay to prevent immediate close on open click
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'absolute right-0 mt-2 w-80 sm:w-96',
        'bg-[var(--dropdown-bg)] rounded-xl shadow-lg',
        'border border-[var(--border)]',
        'z-50 animate-scaleIn origin-top-right'
      )}
      role="menu"
      aria-label="Notifikasi"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Notifikasi
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-medium bg-[var(--primary)] text-white rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status indicator */}
          <div
            className="flex items-center gap-1"
            title={isConnected ? 'Terhubung secara real-time' : 'Tidak terhubung'}
          >
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
          </div>
          {/* Mark all as read */}
          {hasNotifications && unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onMarkAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Tandai semua
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--primary)]" />
          </div>
        ) : hasNotifications ? (
          <div className="p-2 space-y-1">
            {notifications.slice(0, 5).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onClick={onClose}
              />
            ))}
          </div>
        ) : (
          <NotificationEmpty />
        )}
      </div>

      {/* Footer */}
      {hasNotifications && (
        <div className="border-t border-[var(--border)] p-2">
          <Link
            href="/notifications"
            onClick={onClose}
            className={cn(
              'block w-full px-4 py-2 text-center text-sm font-medium',
              'text-[var(--primary)] hover:bg-[var(--hover-bg)] rounded-lg',
              'transition-colors'
            )}
          >
            Lihat semua notifikasi
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
