import { render, screen, fireEvent } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrderDetailPage from './page';

// Mock order detail data
const mockOrderDetail = {
  id: 'order-123456789',
  userId: 'user-1',
  userEmail: 'user@example.com',
  userName: 'John Doe',
  planId: 'plan-1',
  imageId: 'image-1',
  status: 'PENDING_PAYMENT' as const,
  totalAmount: 500000,
  duration: 3,
  hostname: 'my-vps-server',
  couponCode: 'DISCOUNT10',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  plan: {
    id: 'plan-1',
    name: 'VPS Basic',
    cpu: 1,
    ram: 2,
    ssd: 25,
    bandwidth: 1,
    priceMonthly: 150000,
    isActive: true,
  },
  image: {
    id: 'image-1',
    name: 'Ubuntu 22.04',
    slug: 'ubuntu-22-04',
    distribution: 'Ubuntu',
    version: '22.04',
    isActive: true,
  },
  statusHistory: [
    {
      id: 'history-1',
      orderId: 'order-123456789',
      previousStatus: 'PENDING_PAYMENT' as const,
      newStatus: 'PAYMENT_RECEIVED' as const,
      changedBy: 'admin',
      reason: 'Manual verification',
      createdAt: '2024-01-15T11:00:00Z',
    },
  ],
};

// Mock params
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useParams: () => ({
    id: 'order-123456789',
  }),
  usePathname: () => '/orders/order-123456789',
}));

// Mock hooks
vi.mock('@/hooks/use-admin-orders', () => ({
  useAdminOrderDetail: vi.fn(() => ({
    data: mockOrderDetail,
    isLoading: false,
  })),
  useUpdatePaymentStatus: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  formatDateTime: () => '15 Januari 2024, 10:00',
  getOrderStatusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING_PAYMENT: 'Menunggu Pembayaran',
      ACTIVE: 'Aktif',
      FAILED: 'Gagal',
      PAYMENT_RECEIVED: 'Pembayaran Diterima',
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

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render order ID in header', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText(/Order #order-12/)).toBeInTheDocument();
    });

    it('should render order status badge', () => {
      render(<OrderDetailPage />);
      
      // Multiple badges may show same status (e.g., current status and history)
      const statusElements = screen.getAllByText('Menunggu Pembayaran');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should render back button', () => {
      render(<OrderDetailPage />);
      
      const backButton = document.querySelector('[aria-label]') || 
        document.querySelector('button svg');
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Order Summary', () => {
    it('should render order summary section', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Ringkasan Pesanan')).toBeInTheDocument();
    });

    it('should render plan name', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('VPS Basic')).toBeInTheDocument();
    });

    it('should render OS image name', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Ubuntu 22.04')).toBeInTheDocument();
    });

    it('should render duration', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('3 bulan')).toBeInTheDocument();
    });

    it('should render hostname', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('my-vps-server')).toBeInTheDocument();
    });

    it('should render plan specifications', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('1 vCPU')).toBeInTheDocument();
      expect(screen.getByText('2 GB RAM')).toBeInTheDocument();
      expect(screen.getByText('25 GB SSD')).toBeInTheDocument();
      expect(screen.getByText('1 TB BW')).toBeInTheDocument();
    });

    it('should render total amount', () => {
      render(<OrderDetailPage />);
      
      // Look for the formatted currency
      const totalElements = screen.getAllByText(/Rp/);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it('should render coupon code when present', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText(/Kupon: DISCOUNT10/)).toBeInTheDocument();
    });
  });

  describe('Customer Information', () => {
    it('should render customer info section', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Informasi Pelanggan')).toBeInTheDocument();
    });

    it('should render customer name', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render customer email', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('should render link to user detail', () => {
      render(<OrderDetailPage />);
      
      const userDetailButton = screen.getByRole('button', { name: 'Lihat Detail Pengguna' });
      expect(userDetailButton).toBeInTheDocument();
    });
  });

  describe('Payment Information', () => {
    it('should render payment info section', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Informasi Pembayaran')).toBeInTheDocument();
    });

    it('should show unpaid status when not paid', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Belum dibayar')).toBeInTheDocument();
    });
  });

  describe('Admin Actions', () => {
    it('should render admin actions section for pending payment', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Aksi Admin')).toBeInTheDocument();
    });

    it('should render mark as paid button', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByRole('button', { name: /Tandai Sudah Dibayar/i })).toBeInTheDocument();
    });

    it('should render mark as failed button', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByRole('button', { name: /Tandai Gagal/i })).toBeInTheDocument();
    });

    it('should open confirm modal when mark as paid is clicked', () => {
      render(<OrderDetailPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /Tandai Sudah Dibayar/i }));
      
      expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
    });

    it('should open confirm modal when mark as failed is clicked', () => {
      render(<OrderDetailPage />);
      
      fireEvent.click(screen.getByRole('button', { name: /Tandai Gagal/i }));
      
      expect(screen.getByText('Konfirmasi Pembayaran Gagal')).toBeInTheDocument();
    });
  });

  describe('Status History', () => {
    it('should render status history when available', () => {
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Riwayat Status')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when fetching', async () => {
      const { useAdminOrderDetail } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrderDetail).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminOrderDetail>);
      
      render(<OrderDetailPage />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Not Found State', () => {
    it('should show not found when order does not exist', async () => {
      const { useAdminOrderDetail } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrderDetail).mockReturnValue({
        data: null,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrderDetail>);
      
      render(<OrderDetailPage />);
      
      expect(screen.getByText('Pesanan Tidak Ditemukan')).toBeInTheDocument();
      expect(screen.getByText('Pesanan dengan ID ini tidak ada')).toBeInTheDocument();
    });

    it('should render back to orders link when not found', async () => {
      const { useAdminOrderDetail } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrderDetail).mockReturnValue({
        data: null,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrderDetail>);
      
      render(<OrderDetailPage />);
      
      expect(screen.getByRole('button', { name: 'Kembali ke Daftar Pesanan' })).toBeInTheDocument();
    });
  });

  describe('Non-Pending Payment Order', () => {
    it('should not show admin actions for non-pending orders', async () => {
      const { useAdminOrderDetail } = await import('@/hooks/use-admin-orders');
      vi.mocked(useAdminOrderDetail).mockReturnValue({
        data: {
          ...mockOrderDetail,
          status: 'ACTIVE' as const,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminOrderDetail>);
      
      render(<OrderDetailPage />);
      
      expect(screen.queryByText('Aksi Admin')).not.toBeInTheDocument();
    });
  });
});
