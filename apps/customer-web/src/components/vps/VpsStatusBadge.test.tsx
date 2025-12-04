import { render, screen } from '@/test/test-utils';
import { describe, it, expect } from 'vitest';
import { VpsStatusBadge } from './VpsStatusBadge';

describe('VpsStatusBadge', () => {
  it('should render active status correctly', () => {
    render(<VpsStatusBadge status="ACTIVE" />);
    const badge = screen.getByText('Aktif');
    expect(badge).toBeInTheDocument();
    // Check for parent class or aria-label to verify styling/config mapping
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Status: Aktif');
    expect(container.className).toContain('bg-emerald-500/10');
  });

  it('should render pending status correctly', () => {
    render(<VpsStatusBadge status="PENDING" />);
    const badge = screen.getByText('Menunggu');
    expect(badge).toBeInTheDocument();
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('aria-label', 'Status: Menunggu');
    expect(container.className).toContain('bg-slate-500/10');
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<VpsStatusBadge status="ACTIVE" size="sm" />);
    let container = screen.getByRole('status');
    expect(container.className).toContain('text-[10px]');

    rerender(<VpsStatusBadge status="ACTIVE" size="lg" />);
    container = screen.getByRole('status');
    expect(container.className).toContain('text-sm');
  });

  it('should hide icon when showIcon is false', () => {
    render(<VpsStatusBadge status="ACTIVE" showIcon={false} />);
    const container = screen.getByRole('status');
    // The dot span should not be present. The dot is the only empty span with aria-hidden
    // But we can just check if there are fewer spans or specific class check
    // The dot has 'w-2 h-2' etc.
    const dots = container.querySelectorAll('span[aria-hidden="true"]');
    expect(dots.length).toBe(0);
  });
});
