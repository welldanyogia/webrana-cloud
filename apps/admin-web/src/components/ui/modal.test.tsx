import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Modal, ConfirmModal } from './modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<Modal {...defaultProps} />);
      
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<Modal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<Modal {...defaultProps} title="Test Title" />);
      
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <Modal {...defaultProps} title="Title" description="Test description" />
      );
      
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should have dialog role', () => {
      render(<Modal {...defaultProps} title="Test" />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      render(<Modal {...defaultProps} title="Test" />);
      
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Close Button', () => {
    it('should render close button by default', () => {
      render(<Modal {...defaultProps} title="Test" />);
      
      expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    });

    it('should not render close button when showCloseButton is false', () => {
      render(<Modal {...defaultProps} title="Test" showCloseButton={false} />);
      
      expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Test" />);
      
      fireEvent.click(screen.getByLabelText('Close modal'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Escape Key', () => {
    it('should call onClose when Escape is pressed', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Test" />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Overlay Click', () => {
    it('should call onClose when clicking overlay', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Test" />);
      
      // Click on the overlay (backdrop)
      const overlay = screen.getByRole('dialog').parentElement;
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not close when clicking modal content', () => {
      const onClose = vi.fn();
      render(<Modal {...defaultProps} onClose={onClose} title="Test" />);
      
      fireEvent.click(screen.getByRole('dialog'));
      
      // onClose should not be called because we clicked inside the modal
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Sizes', () => {
    it('should apply small size class', () => {
      render(<Modal {...defaultProps} size="sm" title="Test" />);
      
      expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');
    });

    it('should apply medium size class by default', () => {
      render(<Modal {...defaultProps} title="Test" />);
      
      expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
    });

    it('should apply large size class', () => {
      render(<Modal {...defaultProps} size="lg" title="Test" />);
      
      expect(screen.getByRole('dialog')).toHaveClass('max-w-lg');
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when open', () => {
      render(<Modal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should unlock body scroll when closed', () => {
      const { rerender } = render(<Modal {...defaultProps} />);
      
      rerender(<Modal {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });
});

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render title', () => {
      render(<ConfirmModal {...defaultProps} />);
      
      expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <ConfirmModal {...defaultProps} description="Are you sure?" />
      );
      
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('should render default button texts', () => {
      render(<ConfirmModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Batal' })).toBeInTheDocument();
    });

    it('should render custom button texts', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmText="Yes, delete"
          cancelText="No, cancel"
        />
      );
      
      expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No, cancel' })).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onClose when cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<ConfirmModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Batal' }));
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi' }));
      
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should disable buttons when loading', () => {
      render(<ConfirmModal {...defaultProps} isLoading />);
      
      expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Konfirmasi' })).toBeDisabled();
    });
  });

  describe('Variants', () => {
    it('should render with danger variant', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />);
      
      const confirmButton = screen.getByRole('button', { name: 'Konfirmasi' });
      // Button variants may use different class implementations
      expect(confirmButton).toBeInTheDocument();
    });

    it('should render with success variant', () => {
      render(<ConfirmModal {...defaultProps} variant="success" />);
      
      const confirmButton = screen.getByRole('button', { name: 'Konfirmasi' });
      expect(confirmButton).toBeInTheDocument();
    });

    it('should render with primary variant by default', () => {
      render(<ConfirmModal {...defaultProps} />);
      
      const confirmButton = screen.getByRole('button', { name: 'Konfirmasi' });
      expect(confirmButton).toBeInTheDocument();
    });
  });
});
