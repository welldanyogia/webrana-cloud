import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DoAccountsPage from './page';
import * as doAccountsApi from '@/lib/api/do-accounts';

// Mock the API module
vi.mock('@/lib/api/do-accounts', () => ({
  getDoAccounts: vi.fn(),
  getDoAccountStats: vi.fn(),
  syncAllDoAccounts: vi.fn(),
}));

const mockAccounts: doAccountsApi.DoAccount[] = [
  {
    id: '1',
    name: 'Primary Account',
    email: 'primary@webrana.com',
    dropletLimit: 25,
    activeDroplets: 10,
    isActive: true,
    isPrimary: true,
    healthStatus: 'HEALTHY',
    lastHealthCheck: '2024-01-15T10:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Secondary Account',
    email: 'secondary@webrana.com',
    dropletLimit: 25,
    activeDroplets: 20,
    isActive: true,
    isPrimary: false,
    healthStatus: 'DEGRADED',
    lastHealthCheck: '2024-01-15T09:00:00Z',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '3',
    name: 'Inactive Account',
    email: 'inactive@webrana.com',
    dropletLimit: 25,
    activeDroplets: 0,
    isActive: false,
    isPrimary: false,
    healthStatus: 'UNKNOWN',
    lastHealthCheck: null,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

const mockStats: doAccountsApi.DoAccountStats = {
  totalAccounts: 3,
  activeAccounts: 2,
  healthyAccounts: 1,
  unhealthyAccounts: 0,
  fullAccounts: 0,
  totalDropletLimit: 75,
  totalActiveDroplets: 30,
  utilizationPercent: 40,
};

describe('DoAccountsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(doAccountsApi.getDoAccounts).mockResolvedValue(mockAccounts);
    vi.mocked(doAccountsApi.getDoAccountStats).mockResolvedValue(mockStats);
    vi.mocked(doAccountsApi.syncAllDoAccounts).mockResolvedValue({ synced: 3 });
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      // Make the API hang so we can see loading state
      vi.mocked(doAccountsApi.getDoAccounts).mockImplementation(
        () => new Promise(() => {})
      );
      vi.mocked(doAccountsApi.getDoAccountStats).mockImplementation(
        () => new Promise(() => {})
      );

      render(<DoAccountsPage />);

      // Should show skeleton loading
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Content Display', () => {
    it('should render page title and description', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('DigitalOcean Accounts')).toBeInTheDocument();
        expect(
          screen.getByText('Manage your DigitalOcean provider accounts')
        ).toBeInTheDocument();
      });
    });

    it('should display all accounts in the table', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Primary Account')).toBeInTheDocument();
        expect(screen.getByText('Secondary Account')).toBeInTheDocument();
        expect(screen.getByText('Inactive Account')).toBeInTheDocument();
      });
    });

    it('should display account emails', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('primary@webrana.com')).toBeInTheDocument();
        expect(screen.getByText('secondary@webrana.com')).toBeInTheDocument();
        expect(screen.getByText('inactive@webrana.com')).toBeInTheDocument();
      });
    });

    it('should show primary badge for primary account', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        // Primary account should have a star icon
        const primaryRow = screen.getByText('Primary Account').closest('tr');
        expect(primaryRow?.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should show inactive badge for inactive accounts', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('should display health status badges', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(screen.getByText('Degraded')).toBeInTheDocument();
        expect(screen.getByText('Unknown')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Cards', () => {
    it('should display total accounts stat', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Accounts')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });

    it('should display healthy accounts stat', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Healthy Accounts')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should display capacity stat', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        // There are multiple "Capacity" elements (stat card + table header)
        const capacityElements = screen.getAllByText('Capacity');
        expect(capacityElements.length).toBeGreaterThanOrEqual(1);
        // The capacity value is rendered as a StatCard value
        expect(screen.getByText(/30\/75/)).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should have Add Account button with correct link', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        const addButton = screen.getByText('Add Account');
        expect(addButton.closest('a')).toHaveAttribute(
          'href',
          '/settings/do-accounts/new'
        );
      });
    });

    it('should have Sync All button', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync All')).toBeInTheDocument();
      });
    });

    it('should call syncAllDoAccounts when Sync All is clicked', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('Sync All')).toBeInTheDocument();
      });

      const syncButton = screen.getByText('Sync All').closest('button');
      fireEvent.click(syncButton!);

      await waitFor(() => {
        expect(doAccountsApi.syncAllDoAccounts).toHaveBeenCalled();
      });
    });

    it('should have settings button for each account', async () => {
      render(<DoAccountsPage />);

      await waitFor(() => {
        const settingsButtons = screen.getAllByRole('button', {
          name: /manage account/i,
        });
        expect(settingsButtons.length).toBe(3);
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no accounts', async () => {
      vi.mocked(doAccountsApi.getDoAccounts).mockResolvedValue([]);
      vi.mocked(doAccountsApi.getDoAccountStats).mockResolvedValue({
        ...mockStats,
        totalAccounts: 0,
        activeAccounts: 0,
      });

      render(<DoAccountsPage />);

      await waitFor(() => {
        expect(screen.getByText('No Accounts Found')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Add your first DigitalOcean account to start provisioning VPS instances.'
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      vi.mocked(doAccountsApi.getDoAccounts).mockRejectedValue(
        new Error('Network error')
      );
      vi.mocked(doAccountsApi.getDoAccountStats).mockRejectedValue(
        new Error('Network error')
      );

      render(<DoAccountsPage />);

      // Should not crash, will show empty state or error toast
      await waitFor(() => {
        expect(screen.getByText('DigitalOcean Accounts')).toBeInTheDocument();
      });
    });
  });
});
