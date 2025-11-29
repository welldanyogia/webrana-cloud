import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RevenueChart } from './revenue-chart';
import type { DailyStats } from '@/services/analytics.service';

// Mock ResizeObserver for Recharts
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container" style={{ width: '100%', height: '300px' }}>
        {children}
      </div>
    ),
  };
});

const mockData: DailyStats[] = [
  { date: '2024-01-01', orders: 5, revenue: 750000 },
  { date: '2024-01-02', orders: 8, revenue: 1200000 },
  { date: '2024-01-03', orders: 3, revenue: 450000 },
  { date: '2024-01-04', orders: 12, revenue: 1800000 },
  { date: '2024-01-05', orders: 7, revenue: 1050000 },
];

const emptyData: DailyStats[] = [];

describe('RevenueChart', () => {
  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<RevenueChart data={[]} isLoading />);
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should have loading animation class', () => {
      render(<RevenueChart data={[]} isLoading />);
      const loadingText = screen.getByText('Memuat data...');
      expect(loadingText.parentElement).toHaveClass('animate-pulse');
    });

    it('should show loading even with data when isLoading is true', () => {
      render(<RevenueChart data={mockData} isLoading />);
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when data is empty array', () => {
      render(<RevenueChart data={emptyData} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should show empty message when data is null', () => {
      render(<RevenueChart data={null as unknown as DailyStats[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should show empty message when data is undefined', () => {
      render(<RevenueChart data={undefined as unknown as DailyStats[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });
  });

  describe('With Data', () => {
    it('should render chart container when data is present', () => {
      render(<RevenueChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should not show loading state when data is present', () => {
      render(<RevenueChart data={mockData} />);
      expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument();
    });

    it('should not show empty state when data is present', () => {
      render(<RevenueChart data={mockData} />);
      expect(screen.queryByText('Tidak ada data')).not.toBeInTheDocument();
    });

    it('should render with single data point', () => {
      const singleData = [{ date: '2024-01-01', orders: 5, revenue: 750000 }];
      render(<RevenueChart data={singleData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Chart Container', () => {
    it('should have correct height', () => {
      render(<RevenueChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ height: '300px' });
    });

    it('should have full width', () => {
      render(<RevenueChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ width: '100%' });
    });
  });

  describe('Data Handling', () => {
    it('should handle large revenue values', () => {
      const largeData = [
        { date: '2024-01-01', orders: 100, revenue: 100000000 },
        { date: '2024-01-02', orders: 150, revenue: 150000000 },
      ];
      render(<RevenueChart data={largeData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle zero revenue values', () => {
      const zeroData = [
        { date: '2024-01-01', orders: 0, revenue: 0 },
        { date: '2024-01-02', orders: 0, revenue: 0 },
      ];
      render(<RevenueChart data={zeroData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });
});
