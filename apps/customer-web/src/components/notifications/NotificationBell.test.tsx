import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { NotificationBell } from './NotificationBell';

// Mock the useNotifications hook
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(() => ({
    notifications: [],
    unreadCount: 0,
    isConnected: true,
    isLoading: false,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refetch: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn(() => ({
    token: 'mock-token',
    isAuthenticated: true,
    user: { id: 'user-1', name: 'Test User' },
  })),
}));

import { useNotifications } from '@/hooks/use-notifications';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render bell button', () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have proper aria-label', () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Notifikasi'
      );
    });

    it('should not show badge when no unread notifications', () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('With unread notifications', () => {
    it('should show unread badge', () => {
      vi.mocked(useNotifications).mockReturnValue({
        notifications: [],
        unreadCount: 5,
        isConnected: true,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        refetch: vi.fn(),
      });

      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 99+ for counts over 99', () => {
      vi.mocked(useNotifications).mockReturnValue({
        notifications: [],
        unreadCount: 150,
        isConnected: true,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        refetch: vi.fn(),
      });

      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should update aria-label with unread count', () => {
      vi.mocked(useNotifications).mockReturnValue({
        notifications: [],
        unreadCount: 5,
        isConnected: true,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        refetch: vi.fn(),
      });

      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Notifikasi (5 belum dibaca)'
      );
    });
  });

  describe('Interactions', () => {
    it('should toggle dropdown on click', () => {
      vi.mocked(useNotifications).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        isConnected: true,
        isLoading: false,
        markAsRead: vi.fn(),
        markAllAsRead: vi.fn(),
        refetch: vi.fn(),
      });

      render(<NotificationBell />, { wrapper: createWrapper() });

      // Dropdown should not be visible initially
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click again to close
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('should have aria-expanded attribute', () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-haspopup attribute', () => {
      render(<NotificationBell />, { wrapper: createWrapper() });
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-haspopup',
        'menu'
      );
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<NotificationBell className="custom-class" />, {
        wrapper: createWrapper(),
      });
      const container = screen.getByRole('button').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });
});
