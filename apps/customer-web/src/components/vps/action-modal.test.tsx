import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ActionModal } from './action-modal';

// Mock the use-instances hook
vi.mock('@/hooks/use-instances', () => ({
  ACTION_LABELS: {
    reboot: 'Restart Server',
    power_on: 'Nyalakan Server',
    power_off: 'Matikan Server',
    reset_password: 'Reset Password Root',
  },
}));

describe('ActionModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    actionType: 'reboot' as const,
    hostname: 'test-server.example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ActionModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Restart Server' })).toBeInTheDocument();
    });

    it('should display hostname', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByText('test-server.example.com')).toBeInTheDocument();
    });

    it('should display action description', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByText(/server akan direstart/i)).toBeInTheDocument();
    });
  });

  describe('Action Types', () => {
    it('should display correct content for reboot action', () => {
      render(<ActionModal {...defaultProps} actionType="reboot" />);
      expect(screen.getByText('Ya, Restart Server')).toBeInTheDocument();
    });

    it('should display correct content for power_on action', () => {
      render(<ActionModal {...defaultProps} actionType="power_on" />);
      expect(screen.getByText('Ya, Nyalakan Server')).toBeInTheDocument();
    });

    it('should display correct content for power_off action', () => {
      render(<ActionModal {...defaultProps} actionType="power_off" />);
      expect(screen.getByText('Ya, Matikan Server')).toBeInTheDocument();
    });

    it('should display correct content for reset_password action', () => {
      render(<ActionModal {...defaultProps} actionType="reset_password" />);
      expect(screen.getByText('Ya, Reset Password')).toBeInTheDocument();
    });
  });

  describe('Dangerous Actions', () => {
    it('should have danger button variant for power_off', () => {
      render(<ActionModal {...defaultProps} actionType="power_off" />);
      const confirmBtn = screen.getByRole('button', { name: 'Ya, Matikan Server' });
      expect(confirmBtn).toHaveClass('bg-[var(--error)]');
    });

    it('should have danger button variant for reset_password', () => {
      render(<ActionModal {...defaultProps} actionType="reset_password" />);
      const confirmBtn = screen.getByRole('button', { name: 'Ya, Reset Password' });
      expect(confirmBtn).toHaveClass('bg-[var(--error)]');
    });

    it('should have primary button variant for non-dangerous actions', () => {
      render(<ActionModal {...defaultProps} actionType="reboot" />);
      const confirmBtn = screen.getByRole('button', { name: 'Ya, Restart Server' });
      expect(confirmBtn).toHaveClass('bg-[var(--primary)]');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when close (X) button is clicked', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} />);
      
      // Click on the backdrop (the element with bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when ESC is pressed while loading', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} isLoading />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Confirm Functionality', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ActionModal {...defaultProps} onConfirm={onConfirm} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Ya, Restart Server' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner on confirm button', () => {
      render(<ActionModal {...defaultProps} isLoading />);
      const confirmBtn = screen.getByRole('button', { name: 'Ya, Restart Server' });
      expect(confirmBtn.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should disable cancel button when loading', () => {
      render(<ActionModal {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
    });

    it('should disable close button when loading', () => {
      render(<ActionModal {...defaultProps} isLoading />);
      expect(screen.getByRole('button', { name: 'Tutup' })).toBeDisabled();
    });

    it('should not close on backdrop click when loading', () => {
      const onClose = vi.fn();
      render(<ActionModal {...defaultProps} onClose={onClose} isLoading />);
      
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to modal title', () => {
      render(<ActionModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should prevent body scrolling when open', () => {
      render(<ActionModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });
  });
});
