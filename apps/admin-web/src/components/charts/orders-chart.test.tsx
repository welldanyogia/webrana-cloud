import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OrdersChart } from './orders-chart';
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

describe('OrdersChart', () => {
  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<OrdersChart data={[]} isLoading />);
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should have loading animation', () => {
      render(<OrdersChart data={[]} isLoading />);
      const loadingText = screen.getByText('Memuat data...');
      expect(loadingText.parentElement).toHaveClass('animate-pulse');
    });
  });

  describe('Empty State', () => {
    it('should show empty message when data is empty', () => {
      render(<OrdersChart data={[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should show empty message when data is undefined', () => {
      render(<OrdersChart data={undefined as unknown as DailyStats[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });
  });

  describe('With Data', () => {
    it('should render chart with data', () => {
      render(<OrdersChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should not show loading when data is present', () => {
      render(<OrdersChart data={mockData} />);
      expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument();
    });

    it('should not show empty message when data is present', () => {
      render(<OrdersChart data={mockData} />);
      expect(screen.queryByText('Tidak ada data')).not.toBeInTheDocument();
    });
  });

  describe('Chart Container', () => {
    it('should have fixed height', () => {
      render(<OrdersChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ height: '300px' });
    });

    it('should have full width', () => {
      render(<OrdersChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ width: '100%' });
    });
  });
});
