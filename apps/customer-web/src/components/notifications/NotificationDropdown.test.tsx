import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationDropdown } from './NotificationDropdown';

import type { Notification } from '@/types';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    title: 'Pembayaran Berhasil',
    message: 'Pembayaran untuk VPS Standard telah berhasil.',
    type: 'payment',
    actionUrl: '/orders/order-123',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    title: 'VPS Aktif',
    message: 'VPS Anda telah aktif dan siap digunakan.',
    type: 'vps',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('NotificationDropdown', () => {
  const defaultProps = {
    notifications: mockNotifications,
    unreadCount: 1,
    isConnected: true,
    isLoading: false,
    onMarkAsRead: vi.fn(),
    onMarkAllAsRead: vi.fn(),
    onClose: vi.fn(),
    isOpen: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering when open', () => {
    it('should render dropdown when isOpen is true', () => {
      render(<NotificationDropdown {...defaultProps} />);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should not render dropdown when isOpen is false', () => {
      render(<NotificationDropdown {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should render header with title', () => {
      render(<NotificationDropdown {...defaultProps} />);
      expect(screen.getByText('Notifikasi')).toBeInTheDocument();
    });

    it('should render unread count badge', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render 99+ for unread count over 99', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={150} />);
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should render notification items', () => {
      render(<NotificationDropdown {...defaultProps} />);
      expect(screen.getByText('Pembayaran Berhasil')).toBeInTheDocument();
      expect(screen.getByText('VPS Aktif')).toBeInTheDocument();
    });

    it('should render view all link', () => {
      render(<NotificationDropdown {...defaultProps} />);
      expect(screen.getByText('Lihat semua notifikasi')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should render empty state when no notifications', () => {
      render(
        <NotificationDropdown
          {...defaultProps}
          notifications={[]}
          unreadCount={0}
        />
      );
      expect(screen.getByText('Tidak ada notifikasi')).toBeInTheDocument();
    });

    it('should not render view all link when empty', () => {
      render(
        <NotificationDropdown
          {...defaultProps}
          notifications={[]}
          unreadCount={0}
        />
      );
      expect(screen.queryByText('Lihat semua notifikasi')).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should render loading spinner when loading', () => {
      render(<NotificationDropdown {...defaultProps} isLoading={true} />);
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Connection status', () => {
    it('should show connected icon when connected', () => {
      render(<NotificationDropdown {...defaultProps} isConnected={true} />);
      const connectedIcon = document.querySelector('.text-green-500');
      expect(connectedIcon).toBeInTheDocument();
    });

    it('should show disconnected icon when not connected', () => {
      render(<NotificationDropdown {...defaultProps} isConnected={false} />);
      const disconnectedIcon = document.querySelector(
        '.text-\\[var\\(--text-muted\\)\\]'
      );
      expect(disconnectedIcon).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onMarkAllAsRead when clicking mark all button', () => {
      const onMarkAllAsRead = vi.fn();
      render(
        <NotificationDropdown
          {...defaultProps}
          onMarkAllAsRead={onMarkAllAsRead}
        />
      );

      fireEvent.click(screen.getByText('Tandai semua'));
      expect(onMarkAllAsRead).toHaveBeenCalled();
    });

    it('should not show mark all button when no unread', () => {
      render(<NotificationDropdown {...defaultProps} unreadCount={0} />);
      expect(screen.queryByText('Tandai semua')).not.toBeInTheDocument();
    });

    it('should call onClose when clicking view all link', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Lihat semua notifikasi'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape', () => {
      const onClose = vi.fn();
      render(<NotificationDropdown {...defaultProps} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Maximum notifications', () => {
    it('should only render max 5 notifications', () => {
      const manyNotifications = Array.from({ length: 10 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notif-${i}`,
        title: `Notification ${i}`,
      }));

      render(
        <NotificationDropdown
          {...defaultProps}
          notifications={manyNotifications}
        />
      );

      const items = screen.getAllByRole('button');
      // 5 notification items + 1 mark all button = 6 buttons
      expect(items.length).toBeLessThanOrEqual(6);
    });
  });
});
