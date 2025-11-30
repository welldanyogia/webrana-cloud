import { render, screen } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from './page';

// Mock the hooks
const mockStats = {
  ordersToday: 15,
  pendingPayment: 5,
  revenueToday: 5000000,
  activeVps: 42,
  totalUsers: 100,
  totalOrders: 500,
};

const mockRecentOrders = [
  {
    id: 'order-123456789',
    userId: 'user-1',
    userEmail: 'user@example.com',
    planId: 'plan-1',
    imageId: 'image-1',
    status: 'PENDING_PAYMENT' as const,
    totalAmount: 500000,
    duration: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'order-987654321',
    userId: 'user-2',
    userEmail: 'admin@example.com',
    planId: 'plan-2',
    imageId: 'image-1',
    status: 'ACTIVE' as const,
    totalAmount: 1000000,
    duration: 3,
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
];

vi.mock('@/hooks/use-admin-stats', () => ({
  useAdminStats: vi.fn(() => ({
    data: mockStats,
    isLoading: false,
  })),
}));

vi.mock('@/hooks/use-admin-orders', () => ({
  useAdminRecentOrders: vi.fn(() => ({
    data: mockRecentOrders,
    isLoading: false,
  })),
  useAdminOrders: vi.fn(() => ({
    data: { items: mockRecentOrders, total: 2, page: 1, limit: 10, totalPages: 1 },
    isLoading: false,
  })),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  formatRelativeTime: () => '1 hari yang lalu',
  getOrderStatusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING_PAYMENT: 'Menunggu Pembayaran',
      ACTIVE: 'Aktif',
      PAYMENT_RECEIVED: 'Pembayaran Diterima',
    };
    return labels[status] || status;
  },
  getOrderStatusVariant: (status: string) => {
    const variants: Record<string, string> = {
      PENDING_PAYMENT: 'warning',
      ACTIVE: 'success',
    };
    return variants[status] || 'secondary';
  },
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Ringkasan aktivitas platform hari ini')).toBeInTheDocument();
    });
  });

  describe('Stats Cards', () => {
    it('should render orders today stat', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Pesanan Hari Ini')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should render pending payment stat', () => {
      render(<DashboardPage />);
      
      // "Menunggu Pembayaran" appears multiple times (stat title and order status)
      const pendingElements = screen.getAllByText('Menunggu Pembayaran');
      expect(pendingElements.length).toBeGreaterThan(0);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render revenue stat', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Pendapatan Hari Ini')).toBeInTheDocument();
    });

    it('should render active VPS stat', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('VPS Aktif')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Recent Orders Section', () => {
    it('should render recent orders card title', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Pesanan Terbaru')).toBeInTheDocument();
    });

    it('should render see all link', () => {
      render(<DashboardPage />);
      
      const seeAllLink = screen.getByText('Lihat Semua');
      expect(seeAllLink).toBeInTheDocument();
      expect(seeAllLink.closest('a')).toHaveAttribute('href', '/orders');
    });

    it('should render order items', () => {
      render(<DashboardPage />);
      
      // Order IDs (truncated)
      expect(screen.getByText(/Order #order-12/)).toBeInTheDocument();
    });

    it('should render order status badges', () => {
      render(<DashboardPage />);
      
      // Status text appears multiple times (stat card and order badges)
      const pendingElements = screen.getAllByText('Menunggu Pembayaran');
      expect(pendingElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('should render order links to detail page', () => {
      render(<DashboardPage />);
      
      const orderLinks = screen.getAllByRole('link');
      const orderDetailLink = orderLinks.find(link => 
        link.getAttribute('href')?.includes('/orders/')
      );
      expect(orderDetailLink).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should render quick actions section', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Akses Cepat')).toBeInTheDocument();
    });

    it('should render pending payment quick action', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Pending Payment')).toBeInTheDocument();
      expect(screen.getByText('Konfirmasi pembayaran')).toBeInTheDocument();
    });

    it('should render all orders quick action', () => {
      render(<DashboardPage />);
      
      expect(screen.getByText('Semua Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Kelola pesanan')).toBeInTheDocument();
    });

    it('should render users quick action', () => {
      render(<DashboardPage />);
      
      const pengguna = screen.getAllByText('Pengguna');
      expect(pengguna.length).toBeGreaterThan(0);
      expect(screen.getByText('Kelola pengguna')).toBeInTheDocument();
    });

    it('should link to correct pages', () => {
      render(<DashboardPage />);
      
      const pendingLink = screen.getByText('Pending Payment').closest('a');
      expect(pendingLink).toHaveAttribute('href', '/orders?status=PENDING_PAYMENT');
      
      const allOrdersLink = screen.getByText('Semua Pesanan').closest('a');
      expect(allOrdersLink).toHaveAttribute('href', '/orders');
      
      const usersLink = screen.getByText('Kelola pengguna').closest('a');
      expect(usersLink).toHaveAttribute('href', '/users');
    });
  });

  describe('Loading State', () => {
    it('should render skeleton when stats are loading', async () => {
      const { useAdminStats } = await import('@/hooks/use-admin-stats');
      vi.mocked(useAdminStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as ReturnType<typeof useAdminStats>);
      
      render(<DashboardPage />);
      
      // Should show skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no recent orders', async () => {
      const { useAdminRecentOrders } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminRecentOrders).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminRecentOrders>);
      
      render(<DashboardPage />);
      
      expect(screen.getByText('Belum Ada Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Pesanan baru akan muncul di sini')).toBeInTheDocument();
    });
  });
});
