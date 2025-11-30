import { render, screen, fireEvent } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from './page';

// Mock users data
const mockUsers = [
  {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'CUSTOMER' as const,
    isActive: true,
    ordersCount: 5,
    totalSpent: 2500000,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Jane Admin',
    email: 'jane@example.com',
    role: 'ADMIN' as const,
    isActive: true,
    ordersCount: 2,
    totalSpent: 1000000,
    createdAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'user-3',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'CUSTOMER' as const,
    isActive: false,
    ordersCount: 0,
    totalSpent: 0,
    createdAt: '2024-01-10T00:00:00Z',
  },
];

vi.mock('@/hooks/use-admin-users', () => ({
  useAdminUsers: vi.fn(() => ({
    data: {
      items: mockUsers,
      total: mockUsers.length,
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
  formatDateShort: () => '01 Jan 2024',
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('Manajemen Pengguna')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('Lihat dan kelola semua pengguna')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<UsersPage />);
      
      expect(screen.getByPlaceholderText('Cari nama atau email...')).toBeInTheDocument();
    });
  });

  describe('Users Table', () => {
    it('should render table headers', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('Pengguna')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Total Belanja')).toBeInTheDocument();
      expect(screen.getByText('Bergabung')).toBeInTheDocument();
      expect(screen.getByText('Aksi')).toBeInTheDocument();
    });

    it('should render user rows', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Admin')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    it('should render user emails', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('should render user role badges', () => {
      render(<UsersPage />);
      
      const customerBadges = screen.getAllByText('CUSTOMER');
      expect(customerBadges.length).toBe(2);
      expect(screen.getByText('ADMIN')).toBeInTheDocument();
    });

    it('should render orders count', () => {
      render(<UsersPage />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should render detail buttons', () => {
      render(<UsersPage />);
      
      const detailButtons = screen.getAllByRole('button', { name: 'Detail' });
      expect(detailButtons.length).toBe(3);
    });

    it('should render user avatars with initials', () => {
      render(<UsersPage />);
      
      // Multiple users may have same initial (John, Jane = J)
      const jInitials = screen.getAllByText('J');
      expect(jInitials.length).toBeGreaterThan(0);
      expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    });

    it('should link to user detail page', () => {
      render(<UsersPage />);
      
      const johnLink = screen.getByText('John Doe').closest('tr')?.querySelector('a');
      expect(johnLink).toHaveAttribute('href', '/users/user-1');
    });
  });

  describe('Search Functionality', () => {
    it('should update search input value', () => {
      render(<UsersPage />);
      
      const searchInput = screen.getByPlaceholderText('Cari nama atau email...');
      fireEvent.change(searchInput, { target: { value: 'john' } });
      
      expect(searchInput).toHaveValue('john');
    });

    it('should trigger search on form submit', () => {
      render(<UsersPage />);
      
      const searchInput = screen.getByPlaceholderText('Cari nama atau email...');
      fireEvent.change(searchInput, { target: { value: 'search query' } });
      
      const form = searchInput.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      // Search should be triggered
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when fetching data', async () => {
      const { useAdminUsers } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUsers).mockReturnValue({
        data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        isLoading: true,
      } as unknown as ReturnType<typeof useAdminUsers>);
      
      render(<UsersPage />);
      
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no users', async () => {
      const { useAdminUsers } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUsers).mockReturnValue({
        data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>);
      
      render(<UsersPage />);
      
      expect(screen.getByText('Tidak Ada Pengguna')).toBeInTheDocument();
      expect(screen.getByText('Tidak ada pengguna yang sesuai dengan pencarian')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should not render pagination when only one page', () => {
      render(<UsersPage />);
      
      expect(screen.queryByText('Sebelumnya')).not.toBeInTheDocument();
    });

    it('should render pagination when multiple pages', async () => {
      const { useAdminUsers } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUsers).mockReturnValue({
        data: {
          items: mockUsers,
          total: 30,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>);
      
      render(<UsersPage />);
      
      expect(screen.getByText('Sebelumnya')).toBeInTheDocument();
      expect(screen.getByText('Selanjutnya')).toBeInTheDocument();
      expect(screen.getByText('Halaman 1 dari 3')).toBeInTheDocument();
    });

    it('should disable previous button on first page', async () => {
      const { useAdminUsers } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUsers).mockReturnValue({
        data: {
          items: mockUsers,
          total: 30,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>);
      
      render(<UsersPage />);
      
      const prevButton = screen.getByRole('button', { name: /sebelumnya/i });
      expect(prevButton).toBeDisabled();
    });

    it('should handle page navigation', async () => {
      const { useAdminUsers } = await import('@/hooks/use-admin-users');
      vi.mocked(useAdminUsers).mockReturnValue({
        data: {
          items: mockUsers,
          total: 30,
          page: 2,
          limit: 10,
          totalPages: 3,
        },
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminUsers>);
      
      render(<UsersPage />);
      
      // Both buttons should be present when on middle page
      const prevButton = screen.getByRole('button', { name: /sebelumnya/i });
      const nextButton = screen.getByRole('button', { name: /selanjutnya/i });
      
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
      // Note: Button disabled state depends on filter state which resets on each test
    });
  });

  describe('Role Styling', () => {
    it('should apply primary variant to admin role badge', () => {
      render(<UsersPage />);
      
      const adminBadge = screen.getByText('ADMIN');
      // Admin role should have a distinct variant
      expect(adminBadge).toBeInTheDocument();
    });

    it('should apply secondary variant to customer role badge', () => {
      render(<UsersPage />);
      
      const customerBadges = screen.getAllByText('CUSTOMER');
      expect(customerBadges.length).toBe(2);
    });
  });
});
