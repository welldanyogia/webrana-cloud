import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PricingSection } from './PricingSection';

describe('PricingSection', () => {
  describe('Rendering', () => {
    it('should render the pricing section', () => {
      render(<PricingSection />);
      const section = document.getElementById('pricing');
      expect(section).toBeInTheDocument();
    });

    it('should display the section heading', () => {
      render(<PricingSection />);
      expect(
        screen.getByRole('heading', { level: 2, name: /pilihan paket cloud vps/i })
      ).toBeInTheDocument();
    });

    it('should display the section description', () => {
      render(<PricingSection />);
      expect(
        screen.getByText(/performa maksimal dengan harga transparan/i)
      ).toBeInTheDocument();
    });
  });

  describe('Billing Cycle Tabs', () => {
    it('should render billing cycle tabs', () => {
      render(<PricingSection />);
      expect(screen.getByRole('button', { name: /harian/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulanan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tahunan/i })).toBeInTheDocument();
    });

    it('should default to monthly billing', () => {
      render(<PricingSection />);
      // Check that monthly price is displayed (100.000 for Standard)
      expect(screen.getByText('100.000')).toBeInTheDocument();
      expect(screen.getAllByText('/ bulan')).toHaveLength(3);
    });

    it('should switch to daily pricing when clicked', () => {
      render(<PricingSection />);
      
      const dailyTab = screen.getByRole('button', { name: /harian/i });
      fireEvent.click(dailyTab);
      
      // Check daily prices are displayed
      expect(screen.getByText('2.000')).toBeInTheDocument();
      expect(screen.getByText('4.000')).toBeInTheDocument();
      expect(screen.getByText('16.000')).toBeInTheDocument();
      expect(screen.getAllByText('/ hari')).toHaveLength(3);
    });

    it('should switch to yearly pricing when clicked', () => {
      render(<PricingSection />);
      
      const yearlyTab = screen.getByRole('button', { name: /tahunan/i });
      fireEvent.click(yearlyTab);
      
      // Check yearly prices are displayed
      expect(screen.getByText('500.000')).toBeInTheDocument();
      expect(screen.getByText('1.000.000')).toBeInTheDocument();
      expect(screen.getByText('4.000.000')).toBeInTheDocument();
      expect(screen.getAllByText('/ tahun')).toHaveLength(3);
    });

    it('should show savings message for yearly billing', () => {
      render(<PricingSection />);
      
      const yearlyTab = screen.getByRole('button', { name: /tahunan/i });
      fireEvent.click(yearlyTab);
      
      // Should show savings message
      expect(screen.getAllByText(/hemat 2 bulan pembayaran/i)).toHaveLength(3);
    });
  });

  describe('Pricing Plans', () => {
    it('should render 3 pricing cards', () => {
      render(<PricingSection />);
      expect(screen.getByText('Basic VPS')).toBeInTheDocument();
      expect(screen.getByText('Standard VPS')).toBeInTheDocument();
      expect(screen.getByText('Pro VPS')).toBeInTheDocument();
    });

    it('should display Basic VPS specs', () => {
      render(<PricingSection />);
      expect(screen.getByText('1 Core')).toBeInTheDocument();
      expect(screen.getByText('1 GB')).toBeInTheDocument();
      expect(screen.getByText('25 GB NVMe')).toBeInTheDocument();
      expect(screen.getByText('1 TB')).toBeInTheDocument();
    });

    it('should display Standard VPS specs', () => {
      render(<PricingSection />);
      expect(screen.getByText('2 Cores')).toBeInTheDocument();
      expect(screen.getByText('2 GB')).toBeInTheDocument();
      expect(screen.getByText('50 GB NVMe')).toBeInTheDocument();
      expect(screen.getByText('2 TB')).toBeInTheDocument();
    });

    it('should display Pro VPS specs', () => {
      render(<PricingSection />);
      expect(screen.getByText('4 Cores')).toBeInTheDocument();
      expect(screen.getByText('8 GB')).toBeInTheDocument();
      expect(screen.getByText('160 GB NVMe')).toBeInTheDocument();
      expect(screen.getByText('5 TB')).toBeInTheDocument();
    });
  });

  describe('Recommended Badge', () => {
    it('should show Recommended badge for Standard plan', () => {
      render(<PricingSection />);
      expect(screen.getByText('Recommended')).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('should render button for each plan', () => {
      render(<PricingSection />);
      expect(screen.getByRole('link', { name: /pilih basic/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pilih standard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pilih pro/i })).toBeInTheDocument();
    });

    it('should link all CTA buttons to /register', () => {
      render(<PricingSection />);
      const links = screen.getAllByRole('link', { name: /pilih/i });
      links.forEach((link) => {
        expect(link).toHaveAttribute('href', '/register');
      });
    });
  });

  describe('Spec Labels', () => {
    it('should display CPU label for each plan', () => {
      render(<PricingSection />);
      expect(screen.getAllByText('CPU')).toHaveLength(3);
    });

    it('should display Memory label for each plan', () => {
      render(<PricingSection />);
      expect(screen.getAllByText('Memory')).toHaveLength(3);
    });

    it('should display Storage label for each plan', () => {
      render(<PricingSection />);
      expect(screen.getAllByText('Storage')).toHaveLength(3);
    });

    it('should display Bandwidth label for each plan', () => {
      render(<PricingSection />);
      expect(screen.getAllByText('Bandwidth')).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have section with pricing id', () => {
      render(<PricingSection />);
      const section = document.getElementById('pricing');
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe('SECTION');
    });

    it('should have proper heading hierarchy', () => {
      render(<PricingSection />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });
  });
});
