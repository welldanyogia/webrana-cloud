import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusIndicator } from './status-indicator';

describe('StatusIndicator', () => {
  describe('Rendering', () => {
    it('should render status indicator', () => {
      render(<StatusIndicator status="active" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should have correct color for active status', () => {
      const { container } = render(<StatusIndicator status="active" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('bg-[var(--success)]');
    });

    it('should have correct color for off status', () => {
      const { container } = render(<StatusIndicator status="off" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('bg-[var(--error)]');
    });

    it('should have correct color for new status', () => {
      const { container } = render(<StatusIndicator status="new" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('bg-[var(--warning)]');
    });

    it('should have correct color for archive status', () => {
      const { container } = render(<StatusIndicator status="archive" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('bg-[var(--text-muted)]');
    });
  });

  describe('Status Labels', () => {
    it('should show label when showLabel is true', () => {
      render(<StatusIndicator status="active" showLabel />);
      expect(screen.getByText('Aktif')).toBeInTheDocument();
    });

    it('should show correct label for off status', () => {
      render(<StatusIndicator status="off" showLabel />);
      expect(screen.getByText('Mati')).toBeInTheDocument();
    });

    it('should show correct label for new status', () => {
      render(<StatusIndicator status="new" showLabel />);
      expect(screen.getByText('Baru')).toBeInTheDocument();
    });

    it('should show correct label for archive status', () => {
      render(<StatusIndicator status="archive" showLabel />);
      expect(screen.getByText('Arsip')).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<StatusIndicator status="active" />);
      expect(screen.queryByText('Aktif')).not.toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply sm size', () => {
      const { container } = render(<StatusIndicator status="active" size="sm" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('w-2', 'h-2');
    });

    it('should apply md size by default', () => {
      const { container } = render(<StatusIndicator status="active" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('w-2.5', 'h-2.5');
    });

    it('should apply lg size', () => {
      const { container } = render(<StatusIndicator status="active" size="lg" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('w-3', 'h-3');
    });

    it('should apply sm text size when showLabel is true', () => {
      render(<StatusIndicator status="active" size="sm" showLabel />);
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-xs');
    });

    it('should apply md text size when showLabel is true', () => {
      render(<StatusIndicator status="active" size="md" showLabel />);
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-sm');
    });

    it('should apply lg text size when showLabel is true', () => {
      render(<StatusIndicator status="active" size="lg" showLabel />);
      const label = screen.getByText('Aktif');
      expect(label).toHaveClass('text-base');
    });
  });

  describe('Animation', () => {
    it('should have pulse animation for active status', () => {
      const { container } = render(<StatusIndicator status="active" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveClass('animate-pulse');
    });

    it('should not have pulse animation for off status', () => {
      const { container } = render(<StatusIndicator status="off" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).not.toHaveClass('animate-pulse');
    });

    it('should not have pulse animation for new status', () => {
      const { container } = render(<StatusIndicator status="new" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).not.toHaveClass('animate-pulse');
    });

    it('should not have pulse animation for archive status', () => {
      const { container } = render(<StatusIndicator status="archive" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).not.toHaveClass('animate-pulse');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', () => {
      render(<StatusIndicator status="active" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have aria-label with status', () => {
      render(<StatusIndicator status="active" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Aktif');
    });

    it('should have correct aria-label for each status', () => {
      const { rerender } = render(<StatusIndicator status="off" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Mati');

      rerender(<StatusIndicator status="new" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Baru');

      rerender(<StatusIndicator status="archive" />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Status: Arsip');
    });

    it('should have aria-hidden on dot element', () => {
      const { container } = render(<StatusIndicator status="active" />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Spacing', () => {
    it('should have correct gap for sm size', () => {
      render(<StatusIndicator status="active" size="sm" showLabel />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('gap-1.5');
    });

    it('should have correct gap for md size', () => {
      render(<StatusIndicator status="active" size="md" showLabel />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('gap-2');
    });

    it('should have correct gap for lg size', () => {
      render(<StatusIndicator status="active" size="lg" showLabel />);
      const container = screen.getByRole('status');
      expect(container).toHaveClass('gap-2.5');
    });
  });
});
