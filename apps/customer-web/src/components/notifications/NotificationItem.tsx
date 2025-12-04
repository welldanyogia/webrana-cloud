'use client';

import {
  ShoppingCart,
  CreditCard,
  Server,
  Bell,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
}

const typeIcons: Record<NotificationType, LucideIcon> = {
  order: ShoppingCart,
  payment: CreditCard,
  vps: Server,
  system: Bell,
};

const typeColors: Record<NotificationType, string> = {
  order: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  vps: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  system: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = typeIcons[notification.type] || Bell;
  const colorClass = typeColors[notification.type] || typeColors.system;

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }

    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        'hover:bg-[var(--hover-bg)]',
        !notification.isRead && 'bg-[var(--primary-muted)]'
      )}
    >
      {/* Icon */}
      <div
        className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center', colorClass)}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm font-medium truncate',
              notification.isRead
                ? 'text-[var(--text-secondary)]'
                : 'text-[var(--text-primary)]'
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5" />
          )}
        </div>
        <p
          className={cn(
            'text-xs mt-0.5 line-clamp-2',
            notification.isRead
              ? 'text-[var(--text-muted)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          {notification.message}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

export default NotificationItem;
