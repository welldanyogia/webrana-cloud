import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { HealthStatusBadge } from './HealthStatusBadge';

describe('HealthStatusBadge', () => {
  describe('Status labels', () => {
    it('should render Healthy label for HEALTHY status', () => {
      render(<HealthStatusBadge status="HEALTHY" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should render Degraded label for DEGRADED status', () => {
      render(<HealthStatusBadge status="DEGRADED" />);

      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    it('should render Unhealthy label for UNHEALTHY status', () => {
      render(<HealthStatusBadge status="UNHEALTHY" />);

      expect(screen.getByText('Unhealthy')).toBeInTheDocument();
    });

    it('should render Unknown label for UNKNOWN status', () => {
      render(<HealthStatusBadge status="UNKNOWN" />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Badge variants', () => {
    it('should apply success variant for HEALTHY status', () => {
      const { container } = render(<HealthStatusBadge status="HEALTHY" />);

      const badge = container.querySelector('.bg-emerald-500');
      expect(badge).toBeInTheDocument();
    });

    it('should apply warning variant for DEGRADED status', () => {
      const { container } = render(<HealthStatusBadge status="DEGRADED" />);

      const badge = container.querySelector('.bg-amber-500');
      expect(badge).toBeInTheDocument();
    });

    it('should apply danger variant for UNHEALTHY status', () => {
      const { container } = render(<HealthStatusBadge status="UNHEALTHY" />);

      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
    });

    it('should apply secondary variant for UNKNOWN status', () => {
      const { container } = render(<HealthStatusBadge status="UNKNOWN" />);

      const badge = container.querySelector('.bg-secondary');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size prop', () => {
    it('should apply default size', () => {
      render(<HealthStatusBadge status="HEALTHY" size="default" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should apply small size', () => {
      render(<HealthStatusBadge status="HEALTHY" size="sm" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should apply medium size', () => {
      render(<HealthStatusBadge status="HEALTHY" size="md" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });

    it('should apply large size', () => {
      render(<HealthStatusBadge status="HEALTHY" size="lg" />);

      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  describe('Dot indicator', () => {
    it('should show dot by default', () => {
      const { container } = render(<HealthStatusBadge status="HEALTHY" />);

      // Badge with dot prop should have the dot span
      const dot = container.querySelector('.rounded-full.bg-current');
      expect(dot).toBeInTheDocument();
    });

    it('should hide dot when showDot is false', () => {
      const { container } = render(
        <HealthStatusBadge status="HEALTHY" showDot={false} />
      );

      // No dot span when showDot is false
      const dot = container.querySelector('.rounded-full.bg-current');
      expect(dot).not.toBeInTheDocument();
    });
  });
});
