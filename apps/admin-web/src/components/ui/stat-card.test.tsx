import { render, screen } from '@testing-library/react';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { describe, it, expect } from 'vitest';

import { StatCard } from './stat-card';

describe('StatCard', () => {
  describe('Rendering', () => {
    it('should render title and value', () => {
      render(<StatCard title="Total Orders" value={42} />);
      
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should render string value', () => {
      render(<StatCard title="Revenue" value="Rp 1.000.000" />);
      
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Rp 1.000.000')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <StatCard
          title="Orders Today"
          value={10}
          description="Total new orders"
        />
      );
      
      expect(screen.getByText('Total new orders')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      render(<StatCard title="Orders" value={5} />);
      
      // Check that there's no description paragraph beyond title
      const container = screen.getByText('Orders').parentElement;
      expect(container?.querySelectorAll('p').length).toBe(2); // Only title and value paragraphs
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      render(
        <StatCard
          title="Orders"
          value={10}
          icon={ShoppingCart}
        />
      );
      
      // Lucide icons render as SVG
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not render icon container when icon is not provided', () => {
      render(<StatCard title="Orders" value={10} />);
      
      // Check there's no icon container
      const iconContainer = document.querySelector('.shrink-0');
      expect(iconContainer).not.toBeInTheDocument();
    });
  });

  describe('Trend', () => {
    it('should render positive trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="Rp 1.000.000"
          trend={{ value: 12.5, isPositive: true }}
        />
      );
      
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs bulan lalu')).toBeInTheDocument();
    });

    it('should render negative trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="Rp 1.000.000"
          trend={{ value: 8.3, isPositive: false }}
        />
      );
      
      expect(screen.getByText('8.3%')).toBeInTheDocument();
    });

    it('should show trending up icon for positive trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="Rp 1.000.000"
          trend={{ value: 10, isPositive: true }}
        />
      );
      
      // TrendingUp icon should be present
      const trendContainer = screen.getByText('10%').closest('div');
      expect(trendContainer).toHaveClass('text-[var(--success)]');
    });

    it('should show trending down icon for negative trend', () => {
      render(
        <StatCard
          title="Revenue"
          value="Rp 500.000"
          trend={{ value: 5, isPositive: false }}
        />
      );
      
      // TrendingDown icon should be present
      const trendContainer = screen.getByText('5%').closest('div');
      expect(trendContainer).toHaveClass('text-[var(--error)]');
    });

    it('should not render trend when not provided', () => {
      render(<StatCard title="Orders" value={10} />);
      
      expect(screen.queryByText('vs bulan lalu')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(
        <StatCard
          title="Orders"
          value={10}
          className="custom-class"
        />
      );
      
      const card = screen.getByText('Orders').closest('div')?.parentElement?.parentElement;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Styling', () => {
    it('should have card styling', () => {
      render(<StatCard title="Orders" value={10} />);
      
      const card = screen.getByText('Orders').closest('div')?.parentElement?.parentElement;
      expect(card).toHaveClass('bg-[var(--card-bg)]');
      expect(card).toHaveClass('rounded-xl');
      expect(card).toHaveClass('border');
    });

    it('should have hover effect', () => {
      render(<StatCard title="Orders" value={10} />);
      
      const card = screen.getByText('Orders').closest('div')?.parentElement?.parentElement;
      expect(card).toHaveClass('hover:shadow-[var(--card-shadow-hover)]');
    });
  });
});
