import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockNotification: Notification = {
  id: 'notif-1',
  userId: 'user-1',
  title: 'Pembayaran Berhasil',
  message: 'Pembayaran untuk VPS Standard telah berhasil diproses.',
  type: 'payment',
  actionUrl: '/orders/order-123',
  isRead: false,
  createdAt: new Date().toISOString(),
};

const mockReadNotification: Notification = {
  ...mockNotification,
  id: 'notif-2',
  isRead: true,
};

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render notification title', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByText('Pembayaran Berhasil')).toBeInTheDocument();
    });

    it('should render notification message', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(
        screen.getByText('Pembayaran untuk VPS Standard telah berhasil diproses.')
      ).toBeInTheDocument();
    });

    it('should render relative time', () => {
      render(<NotificationItem notification={mockNotification} />);
      expect(screen.getByText(/baru saja|menit|jam|hari/i)).toBeInTheDocument();
    });

    it('should render unread indicator for unread notifications', () => {
      render(<NotificationItem notification={mockNotification} />);
      // The unread indicator is a small dot
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-[var(--primary-muted)]');
    });

    it('should not have unread indicator background for read notifications', () => {
      render(<NotificationItem notification={mockReadNotification} />);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('bg-[var(--primary-muted)]');
    });
  });

  describe('Type Icons', () => {
    it('should render payment icon for payment type', () => {
      render(<NotificationItem notification={mockNotification} />);
      // Icon container should have green color class for payment
      const iconContainer = screen.getByRole('button').querySelector('div');
      expect(iconContainer).toHaveClass('bg-green-100');
    });

    it('should render order icon for order type', () => {
      const orderNotification = { ...mockNotification, type: 'order' as const };
      render(<NotificationItem notification={orderNotification} />);
      const iconContainer = screen.getByRole('button').querySelector('div');
      expect(iconContainer).toHaveClass('bg-blue-100');
    });

    it('should render vps icon for vps type', () => {
      const vpsNotification = { ...mockNotification, type: 'vps' as const };
      render(<NotificationItem notification={vpsNotification} />);
      const iconContainer = screen.getByRole('button').querySelector('div');
      expect(iconContainer).toHaveClass('bg-purple-100');
    });

    it('should render system icon for system type', () => {
      const systemNotification = { ...mockNotification, type: 'system' as const };
      render(<NotificationItem notification={systemNotification} />);
      const iconContainer = screen.getByRole('button').querySelector('div');
      expect(iconContainer).toHaveClass('bg-amber-100');
    });
  });

  describe('Interactions', () => {
    it('should call onMarkAsRead when clicking unread notification', () => {
      const onMarkAsRead = vi.fn();
      render(
        <NotificationItem
          notification={mockNotification}
          onMarkAsRead={onMarkAsRead}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onMarkAsRead).toHaveBeenCalledWith('notif-1');
    });

    it('should not call onMarkAsRead when clicking read notification', () => {
      const onMarkAsRead = vi.fn();
      render(
        <NotificationItem
          notification={mockReadNotification}
          onMarkAsRead={onMarkAsRead}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onMarkAsRead).not.toHaveBeenCalled();
    });

    it('should navigate to actionUrl when clicked', () => {
      render(<NotificationItem notification={mockNotification} />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).toHaveBeenCalledWith('/orders/order-123');
    });

    it('should not navigate if no actionUrl', () => {
      const notificationWithoutAction = {
        ...mockNotification,
        actionUrl: undefined,
      };
      render(<NotificationItem notification={notificationWithoutAction} />);

      fireEvent.click(screen.getByRole('button'));
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should call onClick callback', () => {
      const onClick = vi.fn();
      render(
        <NotificationItem notification={mockNotification} onClick={onClick} />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalled();
    });
  });
});
