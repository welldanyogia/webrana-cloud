import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsPage from './page';

// Mock analytics data
const mockDailyStats = [
  { date: '2024-01-01', orders: 10, revenue: 1000000 },
  { date: '2024-01-02', orders: 15, revenue: 1500000 },
  { date: '2024-01-03', orders: 8, revenue: 800000 },
];

const mockPlanDistribution = [
  { planName: 'VPS Basic', count: 45, percentage: 45 },
  { planName: 'VPS Standard', count: 30, percentage: 30 },
  { planName: 'VPS Pro', count: 15, percentage: 15 },
  { planName: 'VPS Enterprise', count: 10, percentage: 10 },
];

const mockSummary = {
  totalOrders: 33,
  totalRevenue: 3300000,
  averageOrderValue: 100000,
  growthRate: 12.5,
};

// Mock analytics service
vi.mock('@/services/analytics.service', () => ({
  getDailyStats: vi.fn(() => Promise.resolve(mockDailyStats)),
  getPlanDistribution: vi.fn(() => Promise.resolve(mockPlanDistribution)),
  getAnalyticsSummary: vi.fn(() => Promise.resolve(mockSummary)),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

// Mock charts
vi.mock('@/components/charts', () => ({
  OrdersChart: ({ data, isLoading }: { data: unknown[]; isLoading?: boolean }) => (
    <div data-testid="orders-chart" data-loading={isLoading}>
      {isLoading ? 'Loading...' : `Chart with ${Array.isArray(data) ? data.length : 0} items`}
    </div>
  ),
  RevenueChart: ({ data, isLoading }: { data: unknown[]; isLoading?: boolean }) => (
    <div data-testid="revenue-chart" data-loading={isLoading}>
      {isLoading ? 'Loading...' : `Chart with ${Array.isArray(data) ? data.length : 0} items`}
    </div>
  ),
  PlansChart: ({ data, isLoading }: { data: unknown[]; isLoading?: boolean }) => (
    <div data-testid="plans-chart" data-loading={isLoading}>
      {isLoading ? 'Loading...' : `Chart with ${Array.isArray(data) ? data.length : 0} items`}
    </div>
  ),
}));

describe('AnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      render(<AnalyticsPage />);
      
      expect(screen.getByText('Analitik')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<AnalyticsPage />);
      
      expect(screen.getByText('Statistik dan laporan platform')).toBeInTheDocument();
    });

    it('should render date range selector', () => {
      render(<AnalyticsPage />);
      
      const select = screen.getByLabelText('Pilih rentang waktu');
      expect(select).toBeInTheDocument();
    });

    it('should have default 30 days selected', () => {
      render(<AnalyticsPage />);
      
      const select = screen.getByLabelText('Pilih rentang waktu') as HTMLSelectElement;
      expect(select.value).toBe('30');
    });
  });

  describe('Summary Stats', () => {
    it('should render total orders stat', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Pesanan')).toBeInTheDocument();
      });
    });

    it('should render total revenue stat', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Pendapatan')).toBeInTheDocument();
      });
    });

    it('should render average order value stat', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Rata-rata Nilai Order')).toBeInTheDocument();
      });
    });

    it('should render growth rate stat', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pertumbuhan')).toBeInTheDocument();
      });
    });
  });

  describe('Charts', () => {
    it('should render orders per day chart section', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pesanan per Hari')).toBeInTheDocument();
      });
    });

    it('should render revenue per day chart section', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Pendapatan per Hari')).toBeInTheDocument();
      });
    });

    it('should render plan distribution chart section', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Distribusi Paket VPS')).toBeInTheDocument();
      });
    });

    it('should render orders chart component', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('orders-chart')).toBeInTheDocument();
      });
    });

    it('should render revenue chart component', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('revenue-chart')).toBeInTheDocument();
      });
    });

    it('should render plans chart component', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('plans-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Date Range Filter', () => {
    it('should render all date range options', () => {
      render(<AnalyticsPage />);
      
      expect(screen.getByRole('option', { name: '7 Hari Terakhir' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '30 Hari Terakhir' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '90 Hari Terakhir' })).toBeInTheDocument();
    });

    it('should update date range when changed', async () => {
      render(<AnalyticsPage />);
      
      const select = screen.getByLabelText('Pilih rentang waktu') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: '7' } });
      
      expect(select.value).toBe('7');
    });

    it('should refetch data when date range changes', async () => {
      const { getDailyStats, getAnalyticsSummary } = await import('@/services/analytics.service');
      
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(getDailyStats).toHaveBeenCalled();
      });
      
      const select = screen.getByLabelText('Pilih rentang waktu');
      fireEvent.change(select, { target: { value: '7' } });
      
      await waitFor(() => {
        expect(getDailyStats).toHaveBeenCalledWith(7);
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading skeletons initially', () => {
      render(<AnalyticsPage />);
      
      // Initially there should be loading skeleton cards
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should pass loading state to charts', () => {
      render(<AnalyticsPage />);
      
      const ordersChart = screen.getByTestId('orders-chart');
      // Initially loading should be true
      expect(ordersChart).toHaveAttribute('data-loading', 'true');
    });
  });

  describe('Data Display', () => {
    it('should display summary values after loading', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('33')).toBeInTheDocument();
      });
    });

    it('should display growth rate with sign', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('+12.5%')).toBeInTheDocument();
      });
    });
  });

  describe('Last Updated Info', () => {
    it('should display last updated timestamp', () => {
      render(<AnalyticsPage />);
      
      expect(screen.getByText(/Data diperbarui secara berkala/)).toBeInTheDocument();
      expect(screen.getByText(/Terakhir dimuat/)).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('should have summary stats in grid', () => {
      render(<AnalyticsPage />);
      
      // Summary stats should be in a grid container
      const grid = document.querySelector('.grid.gap-4');
      expect(grid).toBeInTheDocument();
    });

    it('should have charts in grid', async () => {
      render(<AnalyticsPage />);
      
      await waitFor(() => {
        // Charts section should also be in grid
        const chartsGrid = document.querySelector('.grid.gap-6');
        expect(chartsGrid).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { getDailyStats } = await import('@/services/analytics.service');
      vi.mocked(getDailyStats).mockRejectedValueOnce(new Error('API Error'));
      
      // Should not crash
      render(<AnalyticsPage />);
      
      // Page should still render
      expect(screen.getByText('Analitik')).toBeInTheDocument();
    });
  });
});
