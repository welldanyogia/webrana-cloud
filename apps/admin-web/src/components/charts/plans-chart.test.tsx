import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlansChart } from './plans-chart';
import type { PlanDistribution } from '@/services/analytics.service';

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

const mockData: PlanDistribution[] = [
  { planName: 'VPS Basic', count: 45, percentage: 45 },
  { planName: 'VPS Standard', count: 30, percentage: 30 },
  { planName: 'VPS Pro', count: 15, percentage: 15 },
  { planName: 'VPS Enterprise', count: 8, percentage: 8 },
  { planName: 'VPS Ultimate', count: 2, percentage: 2 },
];

const emptyData: PlanDistribution[] = [];

describe('PlansChart', () => {
  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<PlansChart data={[]} isLoading />);
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should have loading animation class', () => {
      render(<PlansChart data={[]} isLoading />);
      const loadingText = screen.getByText('Memuat data...');
      expect(loadingText.parentElement).toHaveClass('animate-pulse');
    });

    it('should show loading when data is provided but isLoading is true', () => {
      render(<PlansChart data={mockData} isLoading />);
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when data is empty array', () => {
      render(<PlansChart data={emptyData} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should show empty message when data is null', () => {
      render(<PlansChart data={null as unknown as PlanDistribution[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should show empty message when data is undefined', () => {
      render(<PlansChart data={undefined as unknown as PlanDistribution[]} />);
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });
  });

  describe('With Data', () => {
    it('should render chart container when data is present', () => {
      render(<PlansChart data={mockData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should not show loading state when data is present', () => {
      render(<PlansChart data={mockData} />);
      expect(screen.queryByText('Memuat data...')).not.toBeInTheDocument();
    });

    it('should not show empty state when data is present', () => {
      render(<PlansChart data={mockData} />);
      expect(screen.queryByText('Tidak ada data')).not.toBeInTheDocument();
    });

    it('should render with single plan', () => {
      const singlePlan = [{ planName: 'VPS Basic', count: 100, percentage: 100 }];
      render(<PlansChart data={singlePlan} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle many plans', () => {
      const manyPlans = Array.from({ length: 10 }, (_, i) => ({
        planName: `Plan ${i + 1}`,
        count: 10 - i,
        percentage: (10 - i) * 2,
      }));
      render(<PlansChart data={manyPlans} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Chart Container', () => {
    it('should have correct height', () => {
      render(<PlansChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ height: '300px' });
    });

    it('should have full width', () => {
      render(<PlansChart data={mockData} />);
      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveStyle({ width: '100%' });
    });
  });

  describe('Data Handling', () => {
    it('should handle plans with zero count', () => {
      const zeroCountData = [
        { planName: 'VPS Basic', count: 0, percentage: 0 },
        { planName: 'VPS Pro', count: 50, percentage: 100 },
      ];
      render(<PlansChart data={zeroCountData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle plans with large counts', () => {
      const largeData = [
        { planName: 'VPS Basic', count: 10000, percentage: 50 },
        { planName: 'VPS Pro', count: 10000, percentage: 50 },
      ];
      render(<PlansChart data={largeData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle decimal percentages', () => {
      const decimalData = [
        { planName: 'VPS Basic', count: 33, percentage: 33.33 },
        { planName: 'VPS Standard', count: 33, percentage: 33.33 },
        { planName: 'VPS Pro', count: 34, percentage: 33.34 },
      ];
      render(<PlansChart data={decimalData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });
});
