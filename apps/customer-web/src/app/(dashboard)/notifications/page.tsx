'use client';

import { Bell, CheckCheck, Filter, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { NotificationItem, NotificationEmpty } from '@/components/notifications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationsList, useMarkAsRead, useMarkAllAsRead } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'unread' | 'read';

const filterOptions: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'unread', label: 'Belum dibaca' },
  { value: 'read', label: 'Sudah dibaca' },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const isReadParam = filter === 'all' ? undefined : filter === 'read';
  
  const { data, isLoading, isFetching } = useNotificationsList({
    page,
    limit: 20,
    isRead: isReadParam,
  });
  
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta;
  const hasMore = meta ? page < meta.totalPages : false;
  const totalUnread = filter === 'all' 
    ? notifications.filter((n) => !n.isRead).length 
    : 0;

  // Handle mark as read
  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadMutation.mutate(id);
    },
    [markAsReadMutation]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  // Load more handler
  const loadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [isFetching, hasMore]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isFetching, loadMore]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filter]);

  const currentFilterLabel = filterOptions.find((f) => f.value === filter)?.label;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary-muted)] flex items-center justify-center">
            <Bell className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Notifikasi
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {meta?.total ?? 0} notifikasi
              {totalUnread > 0 && ` • ${totalUnread} belum dibaca`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                {currentFilterLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleFilterChange(option.value)}
                  className={cn(filter === option.value && 'bg-[var(--hover-bg)]')}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mark all as read */}
          {totalUnread > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tandai semua dibaca
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        {isLoading && page === 1 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmpty
            message={
              filter === 'unread'
                ? 'Tidak ada notifikasi yang belum dibaca'
                : filter === 'read'
                ? 'Tidak ada notifikasi yang sudah dibaca'
                : 'Tidak ada notifikasi'
            }
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notification) => (
              <div key={notification.id} className="px-2">
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              </div>
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {hasMore && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4 border-t border-[var(--border)]"
          >
            {isFetching ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMore}
                className="text-[var(--primary)]"
              >
                Muat lebih banyak
              </Button>
            )}
          </div>
        )}

        {/* End of list */}
        {!hasMore && notifications.length > 0 && (
          <div className="py-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border)]">
            Anda telah mencapai akhir notifikasi
          </div>
        )}
      </div>
    </div>
  );
}
