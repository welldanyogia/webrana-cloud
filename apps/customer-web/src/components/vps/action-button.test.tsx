import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ActionButton } from './action-button';

// Mock the use-instances hook to provide ACTION_LABELS
vi.mock('@/hooks/use-instances', () => ({
  ACTION_LABELS: {
    reboot: 'Restart Server',
    power_on: 'Nyalakan Server',
    power_off: 'Matikan Server',
    reset_password: 'Reset Password Root',
  },
}));

describe('ActionButton', () => {
  describe('Rendering', () => {
    it('should render reboot action button with label', () => {
      render(<ActionButton actionType="reboot" />);
      expect(screen.getByRole('button', { name: /restart server/i })).toBeInTheDocument();
    });

    it('should render power_on action button with label', () => {
      render(<ActionButton actionType="power_on" />);
      expect(screen.getByRole('button', { name: /nyalakan server/i })).toBeInTheDocument();
    });

    it('should render power_off action button with label', () => {
      render(<ActionButton actionType="power_off" />);
      expect(screen.getByRole('button', { name: /matikan server/i })).toBeInTheDocument();
    });

    it('should render reset_password action button with label', () => {
      render(<ActionButton actionType="reset_password" />);
      expect(screen.getByRole('button', { name: /reset password root/i })).toBeInTheDocument();
    });
  });

  describe('Show Label', () => {
    it('should show label by default', () => {
      render(<ActionButton actionType="reboot" />);
      expect(screen.getByText('Restart Server')).toBeInTheDocument();
    });

    it('should not show label text when showLabel is false', () => {
      render(<ActionButton actionType="reboot" showLabel={false} />);
      // The text shouldn't be visible (only aria-label for accessibility)
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Restart Server');
    });
  });

  describe('Variants', () => {
    it('should have outline variant for reboot', () => {
      render(<ActionButton actionType="reboot" />);
      const button = screen.getByRole('button');
      // Check that it's using the outline variant from Button
      expect(button).toHaveClass('bg-transparent');
    });

    it('should have success variant for power_on', () => {
      render(<ActionButton actionType="power_on" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-[var(--success)]');
    });

    it('should have danger variant for power_off', () => {
      render(<ActionButton actionType="power_off" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-[var(--error)]');
    });

    it('should have outline variant for reset_password', () => {
      render(<ActionButton actionType="reset_password" />);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();
      render(<ActionButton actionType="reboot" onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();
      render(<ActionButton actionType="reboot" onClick={handleClick} disabled />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<ActionButton actionType="reboot" disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('should be disabled when loading', () => {
      render(<ActionButton actionType="reboot" isLoading />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading spinner', () => {
      render(<ActionButton actionType="reboot" isLoading />);
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have title attribute', () => {
      render(<ActionButton actionType="reboot" />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Restart Server');
    });

    it('should have aria-label attribute', () => {
      render(<ActionButton actionType="power_off" />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Matikan Server');
    });
  });

  describe('Icon Only Mode', () => {
    it('should render as icon button when showLabel is false', () => {
      render(<ActionButton actionType="reboot" showLabel={false} />);
      const button = screen.getByRole('button');
      // Icon size should be applied (h-9 w-9)
      expect(button).toHaveClass('h-9', 'w-9');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<ActionButton actionType="reboot" className="custom-action" />);
      expect(screen.getByRole('button')).toHaveClass('custom-action');
    });
  });
});
