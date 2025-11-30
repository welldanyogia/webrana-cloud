import { render, screen } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserDetailPage from './page';

// Mock user detail data
const mockUser = {
  id: 'user-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'CUSTOMER' as const,
  isActive: true,
  ordersCount: 5,
  totalSpent: 2500000,
  createdAt: '2024-01-15T10:00:00Z',
};

const mockUserOrders = [
  {
    id: 'order-1',
    userId: 'user-123',
    planId: 'plan-1',
    imageId: 'image-1',
    status: 'ACTIVE' as const,
    totalAmount: 500000,
    duration: 1,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'order-2',
    userId: 'user-123',
    planId: 'plan-2',
    imageId: 'image-1',
    status: 'PENDING_PAYMENT' as const,
    totalAmount: 1000000,
    duration: 3,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

// Mock params
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  useParams: () => ({
    id: 'user-123',
  }),
  usePathname: () => '/users/user-123',
}));

// Mock hooks
vi.mock('@/hooks/use-admin-users', () => ({
  useAdminUserDetail: vi.fn(() => ({
    data: mockUser,
    isLoading: false,
  })),
  useUserOrders: vi.fn(() => ({
    data: mockUserOrders,
    isLoading: false,
  })),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  formatDateTime: () => '15 Januari 2024, 10:00',
  formatDateShort: () => '15 Jan 2024',
  getOrderStatusLabel: (status: string) => {
    const labels: Record<string, string> = {
      PENDING_PAYMENT: 'Menunggu Pembayaran',
      ACTIVE: 'Aktif',
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

describe('UserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user name in header', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    });

    it('should render user email', () => {
      render(<UserDetailPage />);
      
      // Email appears in header and info section
      const emails = screen.getAllByText('john@example.com');
      expect(emails.length).toBeGreaterThan(0);
    });

    it('should render role badge', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('CUSTOMER')).toBeInTheDocument();
    });

    it('should render back button', () => {
      render(<UserDetailPage />);
      
      const backButton = document.querySelector('button svg');
      expect(backButton).toBeInTheDocument();
    });

    it('should render user avatar with initial', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('J')).toBeInTheDocument();
    });
  });

  describe('User Information Section', () => {
    it('should render information section title', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Informasi Pengguna')).toBeInTheDocument();
    });

    it('should render email in info section', () => {
      render(<UserDetailPage />);
      
      const infoSection = screen.getByText('Informasi Pengguna').closest('div')?.parentElement;
      expect(infoSection).toBeInTheDocument();
    });

    it('should render total orders count', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Total Pesanan')).toBeInTheDocument();
      expect(screen.getByText('5 pesanan')).toBeInTheDocument();
    });

    it('should render total spent', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Total Belanja')).toBeInTheDocument();
    });

    it('should render join date', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Bergabung')).toBeInTheDocument();
    });
  });

  describe('Account Status Section', () => {
    it('should render account status title', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Status Akun')).toBeInTheDocument();
    });

    it('should show active status when user is active', () => {
      render(<UserDetailPage />);
      
      // Use getAllByText since "Aktif" appears multiple times (status badge + order status)
      const activeElements = screen.getAllByText('Aktif');
      expect(activeElements.length).toBeGreaterThan(0);
    });

    it('should show inactive status when user is not active', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: { ...mockUser, isActive: false },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByText('Tidak Aktif')).toBeInTheDocument();
    });
  });

  describe('Order History Section', () => {
    it('should render order history title', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText('Riwayat Pesanan')).toBeInTheDocument();
    });

    it('should render user orders', () => {
      render(<UserDetailPage />);
      
      expect(screen.getByText(/Order #order-1/)).toBeInTheDocument();
      expect(screen.getByText(/Order #order-2/)).toBeInTheDocument();
    });

    it('should render order status badges', () => {
      render(<UserDetailPage />);
      
      expect(screen.getAllByText('Aktif').length).toBeGreaterThan(0);
      expect(screen.getByText('Menunggu Pembayaran')).toBeInTheDocument();
    });

    it('should link to order detail page', () => {
      render(<UserDetailPage />);
      
      const orderLinks = screen.getAllByRole('link');
      const orderDetailLink = orderLinks.find(link => 
        link.getAttribute('href')?.includes('/orders/')
      );
      expect(orderDetailLink).toBeInTheDocument();
    });
  });

  describe('Empty Orders State', () => {
    it('should show empty state when user has no orders', async () => {
      const { useUserOrders } = await import('@/hooks/use-admin-users');
      vi.mocked(useUserOrders).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useUserOrders>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByText('Belum Ada Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Pengguna ini belum memiliki pesanan')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when user is loading', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading skeleton for orders', async () => {
      const { useUserOrders } = await import('@/hooks/use-admin-users');
      vi.mocked(useUserOrders).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as unknown as ReturnType<typeof useUserOrders>);
      
      render(<UserDetailPage />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Not Found State', () => {
    it('should show not found when user does not exist', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: null,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByText('Pengguna Tidak Ditemukan')).toBeInTheDocument();
      expect(screen.getByText('Pengguna dengan ID ini tidak ada')).toBeInTheDocument();
    });

    it('should render back to users link when not found', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: null,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByRole('button', { name: 'Kembali ke Daftar Pengguna' })).toBeInTheDocument();
    });
  });

  describe('Admin User', () => {
    it('should display admin role differently', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: { ...mockUser, role: 'ADMIN' as const },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should display super admin role', async () => {
      const { useAdminUserDetail } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUserDetail).mockReturnValue({
        data: { ...mockUser, role: 'SUPER_ADMIN' as const },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUserDetail>);
      
      render(<UserDetailPage />);
      
      expect(screen.getByText('SUPER_ADMIN')).toBeInTheDocument();
    });
  });
});
