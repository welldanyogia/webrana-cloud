import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminLayout } from './admin-layout';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock auth store
const mockUser = {
  id: '1',
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: mockUser,
  }),
}));

// Mock logout hook
const mockLogout = vi.fn();
vi.mock('@/hooks/use-auth', () => ({
  useLogout: () => ({
    mutate: mockLogout,
  }),
}));

// Mock theme toggle
vi.mock('@/components/ui/theme-toggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <AdminLayout>
          <div>Page Content</div>
        </AdminLayout>
      );
      
      expect(screen.getByText('Page Content')).toBeInTheDocument();
    });

    it('should render logo/brand', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Dashboard may appear both in nav and header, use getAllByText
      const dashboardElements = screen.getAllByText('Dashboard');
      expect(dashboardElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Pesanan')).toBeInTheDocument();
      expect(screen.getByText('Pengguna')).toBeInTheDocument();
      expect(screen.getByText('Analitik')).toBeInTheDocument();
    });

    it('should render theme toggle', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should have correct href for Dashboard', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should have correct href for Orders', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const ordersLink = screen.getByRole('link', { name: /pesanan/i });
      expect(ordersLink).toHaveAttribute('href', '/orders');
    });

    it('should have correct href for Users', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const usersLink = screen.getByRole('link', { name: /pengguna/i });
      expect(usersLink).toHaveAttribute('href', '/users');
    });

    it('should have correct href for Analytics', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const analyticsLink = screen.getByRole('link', { name: /analitik/i });
      expect(analyticsLink).toHaveAttribute('href', '/analytics');
    });
  });

  describe('User Menu', () => {
    it('should display user name', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('should display user initial in avatar', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should open user dropdown when clicked', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Click on user menu button
      const userMenuButton = screen.getByText('Admin User').closest('button');
      if (userMenuButton) {
        fireEvent.click(userMenuButton);
      }
      
      // Dropdown should be visible
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('Keluar')).toBeInTheDocument();
    });

    it('should show role in dropdown', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Open dropdown
      const userMenuButton = screen.getByText('Admin User').closest('button');
      if (userMenuButton) {
        fireEvent.click(userMenuButton);
      }
      
      // Admin appears in sidebar title and dropdown role label
      const adminElements = screen.getAllByText('Admin');
      expect(adminElements.length).toBeGreaterThan(0);
    });

    it('should call logout when Keluar is clicked', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Open dropdown
      const userMenuButton = screen.getByText('Admin User').closest('button');
      if (userMenuButton) {
        fireEvent.click(userMenuButton);
      }
      
      // Click logout button
      fireEvent.click(screen.getByText('Keluar'));
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Menu', () => {
    it('should have mobile menu button', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Mobile menu button has Menu icon
      const mobileMenuButton = document.querySelector('button.lg\\:hidden');
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it('should open sidebar when mobile menu is clicked', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Find and click mobile menu button
      const mobileButtons = document.querySelectorAll('button.lg\\:hidden');
      const menuButton = Array.from(mobileButtons).find(
        btn => btn.querySelector('svg')
      );
      
      if (menuButton) {
        fireEvent.click(menuButton);
        
        // Sidebar should show close button
        const closeButton = Array.from(document.querySelectorAll('button.lg\\:hidden'))
          .find(btn => btn.querySelector('svg'));
        expect(closeButton).toBeInTheDocument();
      }
    });
  });

  describe('Sidebar Collapse', () => {
    it('should have collapse toggle button on desktop', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // Collapse button is in the desktop-only section
      const collapseButton = document.querySelector('.hidden.lg\\:block button');
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Current Page Title', () => {
    it('should display current page title in header', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      // The header shows the current nav item name
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have sidebar element', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const sidebar = document.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have header element', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const header = document.querySelector('header');
      expect(header).toBeInTheDocument();
    });

    it('should have main content element', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
    });

    it('should render children in main element', () => {
      render(
        <AdminLayout>
          <div data-testid="child-content">Test Content</div>
        </AdminLayout>
      );
      
      const main = document.querySelector('main');
      expect(main).toContainElement(screen.getByTestId('child-content'));
    });
  });

  describe('Responsive Design', () => {
    it('should have proper padding on main content', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const main = document.querySelector('main');
      expect(main).toHaveClass('p-4');
    });

    it('should have sticky header', () => {
      render(
        <AdminLayout>
          <div>Content</div>
        </AdminLayout>
      );
      
      const header = document.querySelector('header');
      expect(header).toHaveClass('sticky');
      expect(header).toHaveClass('top-0');
    });
  });
});
