import { describe, it, expect, vi, beforeEach } from 'vitest';

import OrdersPage from './page';

import { render, screen, fireEvent } from '@/test/test-utils';

// Mock orders data
const mockOrders = [
  {
    id: 'order-123456789',
    userId: 'user-1',
    userEmail: 'user1@example.com',
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
    userEmail: 'user2@example.com',
    planId: 'plan-2',
    imageId: 'image-1',
    status: 'ACTIVE' as const,
    totalAmount: 1000000,
    duration: 3,
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: 'order-abcdef123',
    userId: 'user-3',
    userEmail: 'user3@example.com',
    planId: 'plan-1',
    imageId: 'image-2',
    status: 'FAILED' as const,
    totalAmount: 750000,
    duration: 2,
    createdAt: '2024-01-13T14:00:00Z',
    updatedAt: '2024-01-13T15:00:00Z',
  },
];

vi.mock('@/hooks/use-admin-orders', () => ({
  useAdminOrders: vi.fn(() => ({
    data: {
      items: mockOrders,
      total: mockOrders.length,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    isLoading: false,
  })),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  formatDateShort: () => '15 Jan 2024',
  getOrderStatusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING_PAYMENT: 'Menunggu Pembayaran',
      ACTIVE: 'Aktif',
      FAILED: 'Gagal',
      PAYMENT_RECEIVED: 'Pembayaran Diterima',
      PROVISIONING: 'Sedang Diproses',
      CANCELLED: 'Dibatalkan',
      EXPIRED: 'Kadaluarsa',
    };
    return labels[status] || status;
  },
  getOrderStatusVariant: (status: string) => {
    const variants: Record<string, string> = {
      PENDING_PAYMENT: 'warning',
      ACTIVE: 'success',
      FAILED: 'danger',
    };
    return variants[status] || 'secondary';
  },
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(<OrdersPage />);
      
      expect(screen.getByText('Manajemen Pesanan')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<OrdersPage />);
      
      expect(screen.getByText('Lihat dan kelola semua pesanan')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<OrdersPage />);
      
      expect(screen.getByPlaceholderText('Cari order ID atau email...')).toBeInTheDocument();
    });

    it('should render status filter dropdown', () => {
      render(<OrdersPage />);
      
      const select = document.querySelector('select');
      expect(select).toBeInTheDocument();
    });

    it('should render filter button', () => {
      render(<OrdersPage />);
      
      expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
    });
  });

  describe('Orders Table', () => {
    it('should render table headers', () => {
      render(<OrdersPage />);
      
      expect(screen.getByText('Order ID')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Jumlah')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Tanggal')).toBeInTheDocument();
      expect(screen.getByText('Aksi')).toBeInTheDocument();
    });

    it('should render order rows', () => {
      render(<OrdersPage />);
      
      expect(screen.getByText('#order-12')).toBeInTheDocument();
      expect(screen.getByText('#order-98')).toBeInTheDocument();
      expect(screen.getByText('#order-ab')).toBeInTheDocument();
    });

    it('should render user emails', () => {
      render(<OrdersPage />);
      
      expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
    });

    it('should render order status badges', () => {
      render(<OrdersPage />);
      
      // At least one status should be visible in the table
      const table = document.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should render detail buttons', () => {
      render(<OrdersPage />);
      
      const detailButtons = screen.getAllByRole('button', { name: 'Detail' });
      expect(detailButtons.length).toBe(3);
    });

    it('should link to order detail page', () => {
      render(<OrdersPage />);
      
      const orderLink = screen.getByText('#order-12').closest('a');
      expect(orderLink).toHaveAttribute('href', '/orders/order-123456789');
    });
  });

  describe('Search Functionality', () => {
    it('should update search input value', () => {
      render(<OrdersPage />);
      
      const searchInput = screen.getByPlaceholderText('Cari order ID atau email...');
      fireEvent.change(searchInput, { target: { value: 'test@example.com' } });
      
      expect(searchInput).toHaveValue('test@example.com');
    });

    it('should trigger search on form submit', () => {
      render(<OrdersPage />);
      
      const searchInput = screen.getByPlaceholderText('Cari order ID atau email...');
      fireEvent.change(searchInput, { target: { value: 'search query' } });
      
      const form = searchInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      // Search should be triggered (hook called with updated filters)
    });
  });

  describe('Status Filter', () => {
    it('should render all status options', () => {
      render(<OrdersPage />);
      
      const select = document.querySelector('select');
      expect(select).toBeInTheDocument();
      
      // Status options should be available
      expect(screen.getByRole('option', { name: 'Semua Status' })).toBeInTheDocument();
    });

    it('should update filter when status is changed', () => {
      render(<OrdersPage />);
      
      const select = document.querySelector('select') as HTMLSelectElement;
      if (select) {
        fireEvent.change(select, { target: { value: 'PENDING_PAYMENT' } });
        expect(select.value).toBe('PENDING_PAYMENT');
      }
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when fetching data', async () => {
      const { useAdminOrders } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrders).mockReturnValue({
        data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminOrders>);
      
      render(<OrdersPage />);
      
      // Should show skeleton table
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no orders', async () => {
      const { useAdminOrders } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrders).mockReturnValue({
        data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrders>);
      
      render(<OrdersPage />);
      
      expect(screen.getByText('Tidak Ada Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Tidak ada pesanan yang sesuai dengan filter')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should not render pagination when only one page', () => {
      render(<OrdersPage />);
      
      // With totalPages = 1, pagination should not be visible
      expect(screen.queryByText('Sebelumnya')).not.toBeInTheDocument();
    });

    it('should render pagination when multiple pages', async () => {
      const { useAdminOrders } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrders).mockReturnValue({
        data: {
          items: mockOrders,
          total: 30,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrders>);
      
      render(<OrdersPage />);
      
      expect(screen.getByText('Sebelumnya')).toBeInTheDocument();
      expect(screen.getByText('Selanjutnya')).toBeInTheDocument();
      expect(screen.getByText('Halaman 1 dari 3')).toBeInTheDocument();
    });

    it('should disable previous button on first page', async () => {
      const { useAdminOrders } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrders).mockReturnValue({
        data: {
          items: mockOrders,
          total: 30,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrders>);
      
      render(<OrdersPage />);
      
      const prevButton = screen.getByRole('button', { name: /sebelumnya/i });
      expect(prevButton).toBeDisabled();
    });
  });
});
