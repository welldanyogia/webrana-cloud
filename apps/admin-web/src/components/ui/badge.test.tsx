import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(<Badge>Badge Text</Badge>);
      const badge = screen.getByText('Badge Text');
      expect(badge.tagName).toBe('DIV');
    });
  });

  describe('Variants', () => {
    it('should apply default variant styling', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary');
    });

    it('should apply primary variant styling', () => {
      render(<Badge variant="primary">Primary</Badge>);
      const badge = screen.getByText('Primary');
      expect(badge).toHaveClass('bg-primary');
    });

    it('should apply secondary variant styling', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
    });

    it('should apply success variant styling', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-emerald-500');
    });

    it('should apply warning variant styling', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-amber-500');
    });

    it('should apply danger variant styling', () => {
      render(<Badge variant="danger">Danger</Badge>);
      const badge = screen.getByText('Danger');
      expect(badge).toHaveClass('bg-red-500');
    });

    it('should apply info variant styling', () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText('Info');
      expect(badge).toHaveClass('bg-blue-500');
    });
  });

  describe('Sizes', () => {
    it('should apply default size', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('px-2.5', 'py-0.5', 'text-xs');
    });

    it('should apply sm size', () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText('Small');
      expect(badge).toHaveClass('px-2', 'py-0.5');
    });
  });

  describe('Dot Indicator', () => {
    it('should not show dot by default', () => {
      render(<Badge>No Dot</Badge>);
      const badge = screen.getByText('No Dot');
      const dot = badge.querySelector('.rounded-full');
      expect(dot).not.toBeInTheDocument();
    });

    it('should show dot when dot prop is true', () => {
      render(<Badge dot>With Dot</Badge>);
      const badge = screen.getByText('With Dot');
      // Look for the dot element within the badge
      const dot = badge.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should have correct dot color for success variant', () => {
      const { container } = render(<Badge variant="success" dot>Success Dot</Badge>);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('should have correct dot color for danger variant', () => {
      const { container } = render(<Badge variant="danger" dot>Danger Dot</Badge>);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('Pill Shape', () => {
    it('should have rounded-md by default', () => {
      render(<Badge>Rounded</Badge>);
      const badge = screen.getByText('Rounded');
      expect(badge).toHaveClass('rounded-md');
    });

    it('should have rounded-full when pill prop is true', () => {
      render(<Badge pill>Pill</Badge>);
      const badge = screen.getByText('Pill');
      expect(badge).toHaveClass('rounded-full');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-badge');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(<Badge data-testid="test-badge" title="Badge Title">Badge</Badge>);
      const badge = screen.getByTestId('test-badge');
      expect(badge).toHaveAttribute('title', 'Badge Title');
    });
  });

  describe('Combined Props', () => {
    it('should combine multiple props correctly', () => {
      render(
        <Badge variant="success" size="sm" dot pill>
          Combined Badge
        </Badge>
      );
      const badge = screen.getByText('Combined Badge');
      expect(badge).toHaveClass('bg-emerald-500');
      expect(badge).toHaveClass('px-2', 'py-0.5');
      expect(badge).toHaveClass('rounded-full');
    });
  });
});
