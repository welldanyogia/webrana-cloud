'use client';

import { Bell } from 'lucide-react';

interface NotificationEmptyProps {
  message?: string;
}

export function NotificationEmpty({
  message = 'Tidak ada notifikasi',
}: NotificationEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-16 h-16 rounded-full bg-[var(--hover-bg)] flex items-center justify-center mb-4">
        <Bell className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <p className="text-sm text-[var(--text-muted)] text-center">{message}</p>
      <p className="text-xs text-[var(--text-muted)] text-center mt-1">
        Semua notifikasi Anda akan muncul di sini
      </p>
    </div>
  );
}

export default NotificationEmpty;
