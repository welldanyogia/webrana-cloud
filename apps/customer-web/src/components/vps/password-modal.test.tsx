import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PasswordModal } from './password-modal';
import { toast } from 'sonner';

describe('PasswordModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    hostname: 'test-server.example.com',
  };

  // Mock clipboard API
  const mockClipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: mockClipboard,
    });
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<PasswordModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByRole('heading', { name: 'Password Berhasil Direset' })).toBeInTheDocument();
    });

    it('should display hostname', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByText('test-server.example.com')).toBeInTheDocument();
    });
  });

  describe('With Password', () => {
    // Use obviously fake test value - not a real secret
    const FAKE_TEST_VALUE = 'FAKE-TEST-VALUE-FOR-UNIT-TEST';

    it('should display password when provided', () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      expect(screen.getByText(FAKE_TEST_VALUE)).toBeInTheDocument();
    });

    it('should show warning message about saving password', () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      expect(screen.getByText(/simpan password ini sekarang/i)).toBeInTheDocument();
    });

    it('should show copy button', () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      expect(screen.getByRole('button', { name: /salin password/i })).toBeInTheDocument();
    });

    it('should show "Sudah Disimpan" button text', () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      expect(screen.getByRole('button', { name: 'Sudah Disimpan' })).toBeInTheDocument();
    });
  });

  describe('Without Password', () => {
    it('should show email notification message when no password', () => {
      render(<PasswordModal {...defaultProps} password={null} />);
      expect(screen.getByText(/password baru akan dikirim ke alamat email/i)).toBeInTheDocument();
    });

    it('should not show copy button when no password', () => {
      render(<PasswordModal {...defaultProps} password={null} />);
      expect(screen.queryByRole('button', { name: /salin password/i })).not.toBeInTheDocument();
    });

    it('should show "Tutup" button text when no password', () => {
      render(<PasswordModal {...defaultProps} password={null} />);
      expect(screen.getByRole('button', { name: 'Tutup' })).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    // Use obviously fake test value - not a real secret
    const FAKE_TEST_VALUE = 'FAKE-TEST-VALUE-FOR-UNIT-TEST';

    it('should copy password to clipboard when copy button is clicked', async () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      
      const copyButton = screen.getByRole('button', { name: /salin password/i });
      fireEvent.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FAKE_TEST_VALUE);
    });

    it('should show success toast after copying', async () => {
      render(<PasswordModal {...defaultProps} password={FAKE_TEST_VALUE} />);
      
      const copyButton = screen.getByRole('button', { name: /salin password/i });
      fireEvent.click(copyButton);
      
      expect(toast.success).toHaveBeenCalledWith('Password berhasil disalin');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<PasswordModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Tutup' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<PasswordModal {...defaultProps} onClose={onClose} password="FAKE-VALUE" />);
      
      // Find the close button with aria-label "Tutup"
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.getAttribute('aria-label') === 'Tutup');
      if (xButton) {
        fireEvent.click(xButton);
      }
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<PasswordModal {...defaultProps} onClose={onClose} />);
      
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      const onClose = vi.fn();
      render(<PasswordModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when main action button is clicked', () => {
      const onClose = vi.fn();
      render(<PasswordModal {...defaultProps} onClose={onClose} password="FAKE-VALUE" />);
      
      fireEvent.click(screen.getByRole('button', { name: 'Sudah Disimpan' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to modal title', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('should prevent body scrolling when open', () => {
      render(<PasswordModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Password Display', () => {
    it('should have select-all class for password code element', () => {
      render(<PasswordModal {...defaultProps} password="FAKE-VALUE" />);
      const passwordElement = screen.getByText('FAKE-VALUE');
      expect(passwordElement).toHaveClass('select-all');
    });
  });
});
