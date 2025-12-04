import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PasswordStrength } from './password-strength';

describe('PasswordStrength', () => {
  it('should not render anything when password is empty', () => {
    const { container } = render(<PasswordStrength password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('Strength Calculation', () => {
    it('should show "Sangat Lemah" for very weak password (0 requirements)', () => {
      render(<PasswordStrength password="...." />);
      
      expect(screen.getByText('Sangat Lemah')).toBeInTheDocument();
      expect(screen.getByText('Sangat Lemah')).toHaveClass('text-red-500');
    });

    it('should show "Lemah" for weak password (1 requirement met)', () => {
      // Only lowercase met
      render(<PasswordStrength password="abc" />);
      
      expect(screen.getByText('Lemah')).toBeInTheDocument();
    });

    it('should show "Cukup" for medium password (2 requirements met)', () => {
      // Length >= 8 + Lowercase
      render(<PasswordStrength password="abcdefgh" />);
      expect(screen.getByText('Cukup')).toBeInTheDocument();
    });

    it('should show "Kuat" for strong password (3 requirements met)', () => {
      // Length + Lowercase + Uppercase
      render(<PasswordStrength password="Abcdefgh" />);
      
      expect(screen.getByText('Kuat')).toBeInTheDocument();
    });

    it('should show "Sangat Kuat" for very strong password (4 requirements met)', () => {
      // Length + Lowercase + Uppercase + Number
      render(<PasswordStrength password="Abcdefgh1" />);
      
      expect(screen.getByText('Sangat Kuat')).toBeInTheDocument();
    });
  });

  describe('Requirements List', () => {
    it('should show all requirements', () => {
      render(<PasswordStrength password="abc" />);
      
      expect(screen.getByText('Minimal 8 karakter')).toBeInTheDocument();
      expect(screen.getByText('Mengandung huruf besar')).toBeInTheDocument();
      expect(screen.getByText('Mengandung huruf kecil')).toBeInTheDocument();
      expect(screen.getByText('Mengandung angka')).toBeInTheDocument();
    });

    it('should indicate met requirements', () => {
      render(<PasswordStrength password="A" />);
      
      // "Mengandung huruf besar" should be met (green text)
      const uppercaseReq = screen.getByText('Mengandung huruf besar');
      expect(uppercaseReq).toHaveClass('text-green-600');
      
      // "Mengandung huruf kecil" should not be met (muted text)
      const lowercaseReq = screen.getByText('Mengandung huruf kecil');
      expect(lowercaseReq).toHaveClass('text-[var(--text-muted)]');
    });

    it('should indicate unmet requirements', () => {
      render(<PasswordStrength password="a" />);
      
      // "Mengandung huruf besar" should not be met
      const uppercaseReq = screen.getByText('Mengandung huruf besar');
      expect(uppercaseReq).toHaveClass('text-[var(--text-muted)]');
    });
  });

  describe('Visual Indicators', () => {
    it('should show filled bars corresponding to score', () => {
      render(<PasswordStrength password="Abcdefgh1" />); // Score 4
      
      // We expect 4 bars with bg-green-500
      // Using attribute selector to avoid issue with dots in class names
      const bars = document.querySelectorAll('div[class*="bg-green-500"]');
      // Filter to make sure we only get the bars (h-1.5)
      const filledBars = Array.from(bars).filter(el => el.className.includes('h-1.5'));
      
      expect(filledBars.length).toBe(4);
    });

    it('should show empty bars for unmet score', () => {
      render(<PasswordStrength password="abc" />); // Score 1 (a-z only)
      // Score 1 -> 1 filled, 3 empty.
      
      // Escaping the bracket in the selector for bg-[var(--border)]
      // Or using contains check
      const emptyBars = document.querySelectorAll('div[class*="bg-[var(--border)]"]');
      expect(emptyBars.length).toBe(3);
    });
  });
});
