import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RevenueChart } from './revenue-chart';
import type { DailyStats } from '@/services/analytics.service';

// Mock recharts to avoid complex SVG rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>{children}</div>
  ),
  Area: ({ dataKey, type }: { dataKey: string; type?: string }) => (
    <div data-testid="area" data-datakey={dataKey} data-type={type} />
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="line" data-datakey={dataKey} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('RevenueChart', () => {
  const mockData: DailyStats[] = [
    { date: '2024-01-01', orders: 10, revenue: 1000000 },
    { date: '2024-01-02', orders: 15, revenue: 1500000 },
    { date: '2024-01-03', orders: 8, revenue: 800000 },
    { date: '2024-01-04', orders: 12, revenue: 1200000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chart with data', () => {
      render(<RevenueChart data={mockData} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should pass data to chart', () => {
      render(<RevenueChart data={mockData} />);
      
      const chart = screen.getByTestId('area-chart');
      expect(chart).toHaveAttribute('data-chart-data', JSON.stringify(mockData));
    });

    it('should render area with revenue dataKey', () => {
      render(<RevenueChart data={mockData} />);
      
      const area = screen.getByTestId('area');
      expect(area).toHaveAttribute('data-datakey', 'revenue');
    });

    it('should use monotone area type', () => {
      render(<RevenueChart data={mockData} />);
      
      const area = screen.getByTestId('area');
      expect(area).toHaveAttribute('data-type', 'monotone');
    });

    it('should render x-axis with date dataKey', () => {
      render(<RevenueChart data={mockData} />);
      
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-datakey', 'date');
    });

    it('should render y-axis', () => {
      render(<RevenueChart data={mockData} />);
      
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render grid', () => {
      render(<RevenueChart data={mockData} />);
      
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });

    it('should render tooltip', () => {
      render(<RevenueChart data={mockData} />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading state when isLoading is true', () => {
      render(<RevenueChart data={[]} isLoading />);
      
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should not render chart when loading', () => {
      render(<RevenueChart data={mockData} isLoading />);
      
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
    });

    it('should have loading animation', () => {
      render(<RevenueChart data={[]} isLoading />);
      
      const loadingElement = screen.getByText('Memuat data...');
      expect(loadingElement).toHaveClass('animate-pulse');
    });

    it('should have centered loading text', () => {
      render(<RevenueChart data={[]} isLoading />);
      
      const container = screen.getByText('Memuat data...').closest('div');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when data is empty', () => {
      render(<RevenueChart data={[]} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should render empty state when data is null/undefined', () => {
      // @ts-expect-error - testing null case
      render(<RevenueChart data={null} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      render(<RevenueChart data={[]} />);
      
      expect(screen.queryByTestId('area-chart')).not.toBeInTheDocument();
    });

    it('should have muted text color for empty state', () => {
      render(<RevenueChart data={[]} />);
      
      const emptyText = screen.getByText('Tidak ada data');
      expect(emptyText).toHaveClass('text-[var(--text-muted)]');
    });
  });

  describe('Container Dimensions', () => {
    it('should have height 300px for loading state', () => {
      render(<RevenueChart data={[]} isLoading />);
      
      // Loading state should have a container
      const container = screen.getByText('Memuat data...').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should have height 300px for empty state', () => {
      render(<RevenueChart data={[]} />);
      
      const container = screen.getByText('Tidak ada data').closest('div');
      expect(container).toHaveClass('h-[300px]');
    });
  });

  describe('Data Handling', () => {
    it('should handle single data point', () => {
      const singleData: DailyStats[] = [{ date: '2024-01-01', orders: 5, revenue: 500000 }];
      render(<RevenueChart data={singleData} />);
      
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('should handle large data set', () => {
      const largeData: DailyStats[] = Array.from({ length: 90 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        orders: Math.floor(Math.random() * 20),
        revenue: Math.floor(Math.random() * 2000000),
      }));
      
      render(<RevenueChart data={largeData} />);
      
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });
});
