import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CapacityBar } from './CapacityBar';

describe('CapacityBar', () => {
  describe('Rendering', () => {
    it('should render capacity bar with label by default', () => {
      render(<CapacityBar used={5} limit={10} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<CapacityBar used={5} limit={10} showLabel={false} />);

      expect(screen.queryByText('5')).not.toBeInTheDocument();
      expect(screen.queryByText('10')).not.toBeInTheDocument();
    });

    it('should have progressbar role with correct aria attributes', () => {
      render(<CapacityBar used={3} limit={10} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '3');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '10');
    });
  });

  describe('Color coding', () => {
    it('should show green color for low utilization (< 70%)', () => {
      const { container } = render(<CapacityBar used={5} limit={10} />);

      const bar = container.querySelector('.bg-emerald-500');
      expect(bar).toBeInTheDocument();
    });

    it('should show yellow color for medium utilization (70-89%)', () => {
      const { container } = render(<CapacityBar used={8} limit={10} />);

      const bar = container.querySelector('.bg-yellow-500');
      expect(bar).toBeInTheDocument();
    });

    it('should show red color for high utilization (>= 90%)', () => {
      const { container } = render(<CapacityBar used={9} limit={10} />);

      const bar = container.querySelector('.bg-red-500');
      expect(bar).toBeInTheDocument();
    });

    it('should show red color when at 100% capacity', () => {
      const { container } = render(<CapacityBar used={10} limit={10} />);

      const bar = container.querySelector('.bg-red-500');
      expect(bar).toBeInTheDocument();
      expect(screen.getByText('(100%)')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle zero limit gracefully', () => {
      render(<CapacityBar used={0} limit={0} />);

      expect(screen.getByText('(0%)')).toBeInTheDocument();
    });

    it('should cap percentage at 100% when used exceeds limit', () => {
      render(<CapacityBar used={15} limit={10} />);

      // The bar width should be capped at 100%
      const progressbar = screen.getByRole('progressbar');
      const bar = progressbar.querySelector('div');
      expect(bar).toHaveStyle({ width: '100%' });
    });

    it('should handle large numbers', () => {
      render(<CapacityBar used={500} limit={1000} />);

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('(50%)')).toBeInTheDocument();
    });
  });

  describe('Size variants', () => {
    it('should apply sm size class', () => {
      const { container } = render(<CapacityBar used={5} limit={10} size="sm" />);

      const progressbar = container.querySelector('.h-1\\.5');
      expect(progressbar).toBeInTheDocument();
    });

    it('should apply md size class by default', () => {
      const { container } = render(<CapacityBar used={5} limit={10} />);

      const progressbar = container.querySelector('.h-2');
      expect(progressbar).toBeInTheDocument();
    });

    it('should apply lg size class', () => {
      const { container } = render(<CapacityBar used={5} limit={10} size="lg" />);

      const progressbar = container.querySelector('.h-3');
      expect(progressbar).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CapacityBar used={5} limit={10} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
