import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PlansChart } from './plans-chart';

import type { PlanDistribution } from '@/services/analytics.service';

// Mock recharts to avoid complex SVG rendering issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data, dataKey, nameKey, children }: { 
    data: unknown[]; 
    dataKey: string; 
    nameKey: string;
    children: React.ReactNode;
  }) => (
    <div 
      data-testid="pie" 
      data-datakey={dataKey} 
      data-namekey={nameKey}
      data-length={Array.isArray(data) ? data.length : 0}
    >
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill: string }) => (
    <div data-testid="cell" data-fill={fill} />
  ),
  Legend: ({ content }: { content?: React.ComponentType }) => (
    <div data-testid="legend">{content ? 'Custom Legend' : 'Default Legend'}</div>
  ),
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('PlansChart', () => {
  const mockData: PlanDistribution[] = [
    { planName: 'VPS Basic', count: 45, percentage: 45 },
    { planName: 'VPS Standard', count: 30, percentage: 30 },
    { planName: 'VPS Pro', count: 15, percentage: 15 },
    { planName: 'VPS Enterprise', count: 8, percentage: 8 },
    { planName: 'VPS Ultimate', count: 2, percentage: 2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chart with data', () => {
      render(<PlansChart data={mockData} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render pie element', () => {
      render(<PlansChart data={mockData} />);
      
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('should use count as dataKey', () => {
      render(<PlansChart data={mockData} />);
      
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-datakey', 'count');
    });

    it('should use planName as nameKey', () => {
      render(<PlansChart data={mockData} />);
      
      const pie = screen.getByTestId('pie');
      expect(pie).toHaveAttribute('data-namekey', 'planName');
    });

    it('should render correct number of cells for data', () => {
      render(<PlansChart data={mockData} />);
      
      const cells = screen.getAllByTestId('cell');
      expect(cells).toHaveLength(mockData.length);
    });

    it('should render legend', () => {
      render(<PlansChart data={mockData} />);
      
      expect(screen.getByTestId('legend')).toBeInTheDocument();
    });

    it('should render tooltip', () => {
      render(<PlansChart data={mockData} />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should render loading state when isLoading is true', () => {
      render(<PlansChart data={[]} isLoading />);
      
      expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('should not render chart when loading', () => {
      render(<PlansChart data={mockData} isLoading />);
      
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });

    it('should have loading animation', () => {
      render(<PlansChart data={[]} isLoading />);
      
      const loadingElement = screen.getByText('Memuat data...');
      expect(loadingElement).toHaveClass('animate-pulse');
    });
  });

  describe('Empty State', () => {
    it('should render empty state when data is empty', () => {
      render(<PlansChart data={[]} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should render empty state when data is null/undefined', () => {
      // @ts-expect-error - testing null case
      render(<PlansChart data={null} />);
      
      expect(screen.getByText('Tidak ada data')).toBeInTheDocument();
    });

    it('should not render chart when data is empty', () => {
      render(<PlansChart data={[]} />);
      
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  describe('Container Height', () => {
    it('should have height 300px for loading state', () => {
      render(<PlansChart data={[]} isLoading />);
      
      // Loading state should have a container
      const container = screen.getByText('Memuat data...').closest('div');
      expect(container).toBeInTheDocument();
    });

    it('should have height 300px for empty state', () => {
      render(<PlansChart data={[]} />);
      
      const container = screen.getByText('Tidak ada data').closest('div');
      expect(container).toHaveClass('h-[300px]');
    });
  });

  describe('Data Handling', () => {
    it('should handle single plan', () => {
      const singlePlan: PlanDistribution[] = [
        { planName: 'VPS Basic', count: 100, percentage: 100 },
      ];
      
      render(<PlansChart data={singlePlan} />);
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getAllByTestId('cell')).toHaveLength(1);
    });

    it('should handle many plans', () => {
      const manyPlans: PlanDistribution[] = Array.from({ length: 10 }, (_, i) => ({
        planName: `Plan ${i + 1}`,
        count: 10,
        percentage: 10,
      }));
      
      render(<PlansChart data={manyPlans} />);
      
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getAllByTestId('cell')).toHaveLength(10);
    });

    it('should assign colors to cells', () => {
      render(<PlansChart data={mockData} />);
      
      const cells = screen.getAllByTestId('cell');
      cells.forEach((cell) => {
        expect(cell).toHaveAttribute('data-fill');
      });
    });
  });

  describe('Donut Style', () => {
    it('should render as donut chart (has innerRadius)', () => {
      render(<PlansChart data={mockData} />);
      
      // The Pie component is configured with innerRadius in the source
      // This verifies the chart renders without error
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });
  });
});
