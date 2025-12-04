import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Skeleton, SkeletonCard, SkeletonTable } from './skeleton';

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('should render a skeleton element', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('should have animation class', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
    });

    it('should have rounded corners', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('rounded-lg');
    });

    it('should have background color', () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('bg-[var(--hover-bg)]');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Skeleton data-testid="skeleton" className="custom-class" />);
      expect(screen.getByTestId('skeleton')).toHaveClass('custom-class');
    });

    it('should allow size customization via className', () => {
      render(<Skeleton data-testid="skeleton" className="h-4 w-24" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-4');
      expect(skeleton).toHaveClass('w-24');
    });
  });

  describe('Props passing', () => {
    it('should pass through other HTML attributes', () => {
      render(<Skeleton data-testid="skeleton" aria-label="Loading content" />);
      expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-label', 'Loading content');
    });
  });
});

describe('SkeletonCard', () => {
  describe('Rendering', () => {
    it('should render a skeleton card', () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have card styling', () => {
      const { container } = render(<SkeletonCard />);
      expect(container.firstChild).toHaveClass('bg-[var(--card-bg)]');
      expect(container.firstChild).toHaveClass('rounded-xl');
      expect(container.firstChild).toHaveClass('border');
    });

    it('should render multiple skeleton elements inside', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Structure', () => {
    it('should have header skeleton', () => {
      const { container } = render(<SkeletonCard />);
      // Should have a small title skeleton (h-4 w-24)
      const titleSkeleton = container.querySelector('.h-4.w-24');
      expect(titleSkeleton).toBeInTheDocument();
    });

    it('should have icon skeleton', () => {
      const { container } = render(<SkeletonCard />);
      // Should have an icon skeleton (h-11 w-11)
      const iconSkeleton = container.querySelector('.h-11.w-11');
      expect(iconSkeleton).toBeInTheDocument();
    });

    it('should have value skeleton', () => {
      const { container } = render(<SkeletonCard />);
      // Should have a larger value skeleton (h-8 w-20)
      const valueSkeleton = container.querySelector('.h-8.w-20');
      expect(valueSkeleton).toBeInTheDocument();
    });

    it('should have description skeleton', () => {
      const { container } = render(<SkeletonCard />);
      // Should have description skeleton (h-4 w-32)
      const descSkeleton = container.querySelector('.h-4.w-32');
      expect(descSkeleton).toBeInTheDocument();
    });
  });
});

describe('SkeletonTable', () => {
  describe('Rendering', () => {
    it('should render a skeleton table', () => {
      const { container } = render(<SkeletonTable />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should have header row', () => {
      const { container } = render(<SkeletonTable />);
      const headerRow = container.querySelector('.border-b.pb-4');
      expect(headerRow).toBeInTheDocument();
    });

    it('should render 5 rows by default', () => {
      const { container } = render(<SkeletonTable />);
      // Header row + 5 data rows
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(6); // 1 header + 5 rows
    });
  });

  describe('Custom Rows', () => {
    it('should render custom number of rows', () => {
      const { container } = render(<SkeletonTable rows={3} />);
      // Header row + 3 data rows
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(4); // 1 header + 3 rows
    });

    it('should render 10 rows when specified', () => {
      const { container } = render(<SkeletonTable rows={10} />);
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(11); // 1 header + 10 rows
    });

    it('should render 1 row when specified', () => {
      const { container } = render(<SkeletonTable rows={1} />);
      const rows = container.querySelectorAll('.flex.gap-4');
      expect(rows).toHaveLength(2); // 1 header + 1 row
    });
  });

  describe('Structure', () => {
    it('should have 4 columns', () => {
      const { container } = render(<SkeletonTable />);
      const headerRow = container.querySelector('.border-b.pb-4');
      const headerCols = headerRow?.querySelectorAll('.h-4');
      expect(headerCols?.length).toBe(4);
    });

    it('should have skeleton elements in each row', () => {
      const { container } = render(<SkeletonTable />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });
});
