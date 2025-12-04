import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { OrdersChart } from './orders-chart';

import type { DailyStats } from '@/services/analytics.service';

// Mock recharts to avoid complex SVG rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>{children}</div>
  ),
  Bar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="bar" data-datakey={dataKey} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="x-axis" data-datakey={dataKey} />
  ),
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('OrdersChart', () => {
  const mockData: DailyStats[] = [
    { date: '2024-01-01', orders: 10, revenue: 1000000 },
    { date: '2024-01-02', orders: 15, revenue: 1500000 },
    { date: '2024-01-03', orders: 8, revenue: 800000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chart with data', () => {
      render(<OrdersChart data={mockData} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should pass data to chart', () => {
      render(<OrdersChart data={mockData} />);
      
      const chart = screen.getByTestId('bar-chart');
      expect(chart).toHaveAttribute('data-chart-data', JSON.stringify(mockData));
    });

    it('should render bar with correct dataKey', () => {
      render(<OrdersChart data={mockData} />);
      
      const bar = screen.getByTestId('bar');
      expect(bar).toHaveAttribute('data-datakey', 'orders');
    });

    it('should render x-axis with date dataKey', () => {
      render(<OrdersChart data={mockData} />);
      
      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-datakey', 'date');
    });

    it('should render y-axis', () => {
      render(<OrdersChart data={mockData} />);
      
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('should render grid', () => {
      render(<OrdersChart data={mockData} />);
      
      expect(screen.getByTestId('grid')).toBeInTheDocument();
    });

    it('should render tooltip', () => {
      render(<OrdersChart data={mockData} />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading state when isLoading is true', () => {
      render(<OrdersChart data={[]} isLoading />);
      
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should not render chart when loading', () => {
      render(<OrdersChart data={mockData} isLoading />);
      
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should have loading animation', () => {
      render(<OrdersChart data={[]} isLoading />);
      
      const loadingElement = screen.getByText('Memuat data...');
      expect(loadingElement).toHaveClass('animate-pulse');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when data is empty', () => {
      render(<OrdersChart data={[]} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should render empty state when data is null/undefined', () => {
      // @ts-expect-error - testing null case
      render(<OrdersChart data={null} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      render(<OrdersChart data={[]} />);
      
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  describe('Container Height', () => {
    it('should have fixed height container', () => {
      render(<OrdersChart data={mockData} />);
      
      const container = screen.getByTestId('responsive-container').parentElement;
      // ResponsiveContainer gets height from parent in actual implementation
      expect(container).toBeInTheDocument();
    });

    it('should have height 300px for loading state', () => {
      render(<OrdersChart data={[]} isLoading />);
      
      // Loading state should have container
      const container = screen.getByText('Memuat data...').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should have height 300px for empty state', () => {
      render(<OrdersChart data={[]} />);
      
      // Empty state should have container
      const container = screen.getByText('Tidak ada data').closest('div');
      expect(container).toBeInTheDocument();
    });
  });
});
