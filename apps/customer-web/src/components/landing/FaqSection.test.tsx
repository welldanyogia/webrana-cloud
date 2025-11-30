import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FaqSection } from './FaqSection';

describe('FaqSection', () => {
  describe('Rendering', () => {
    it('should render the FAQ section', () => {
      render(<FaqSection />);
      const section = document.getElementById('faq');
      expect(section).toBeInTheDocument();
    });

    it('should display the section heading', () => {
      render(<FaqSection />);
      expect(
        screen.getByRole('heading', { level: 2, name: /pertanyaan umum/i })
      ).toBeInTheDocument();
    });

    it('should display the section description', () => {
      render(<FaqSection />);
      expect(
        screen.getByText(/jawaban untuk pertanyaan yang sering diajukan/i)
      ).toBeInTheDocument();
    });
  });

  describe('FAQ Items', () => {
    it('should render all 5 FAQ questions', () => {
      render(<FaqSection />);
      
      expect(screen.getByText(/apakah server ini berlokasi di indonesia/i)).toBeInTheDocument();
      expect(screen.getByText(/metode pembayaran apa saja yang diterima/i)).toBeInTheDocument();
      expect(screen.getByText(/apakah saya mendapatkan akses root/i)).toBeInTheDocument();
      expect(screen.getByText(/bagaimana dengan refund/i)).toBeInTheDocument();
      expect(screen.getByText(/apakah bisa upgrade paket/i)).toBeInTheDocument();
    });

    it('should have 5 accordion trigger buttons', () => {
      render(<FaqSection />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });
  });

  describe('Accordion Functionality', () => {
    it('should initially hide all answers', () => {
      render(<FaqSection />);
      
      // Answers should not be visible initially (collapsible accordion)
      expect(screen.queryByText(/seluruh armada server kami berlokasi di jakarta/i)).not.toBeInTheDocument();
    });

    it('should expand FAQ when clicked', () => {
      render(<FaqSection />);
      
      const firstQuestion = screen.getByText(/apakah server ini berlokasi di indonesia/i);
      fireEvent.click(firstQuestion);
      
      // Answer should now be visible
      expect(screen.getByText(/seluruh armada server kami berlokasi di jakarta/i)).toBeInTheDocument();
    });

    it('should show location answer content when expanded', () => {
      render(<FaqSection />);
      
      const locationQuestion = screen.getByText(/apakah server ini berlokasi di indonesia/i);
      fireEvent.click(locationQuestion);
      
      expect(screen.getByText(/tier 3 & 4 data center/i)).toBeInTheDocument();
    });

    it('should show payment answer content when expanded', () => {
      render(<FaqSection />);
      
      const paymentQuestion = screen.getByText(/metode pembayaran apa saja yang diterima/i);
      fireEvent.click(paymentQuestion);
      
      expect(screen.getByText(/kami menerima qris/i)).toBeInTheDocument();
      expect(screen.getByText(/tanpa kartu kredit/i)).toBeInTheDocument();
    });

    it('should show root access answer content when expanded', () => {
      render(<FaqSection />);
      
      const rootQuestion = screen.getByText(/apakah saya mendapatkan akses root/i);
      fireEvent.click(rootQuestion);
      
      expect(screen.getByText(/akses root penuh/i)).toBeInTheDocument();
      expect(screen.getByText(/docker, node.js, php/i)).toBeInTheDocument();
    });

    it('should show refund answer content when expanded', () => {
      render(<FaqSection />);
      
      const refundQuestion = screen.getByText(/bagaimana dengan refund/i);
      fireEvent.click(refundQuestion);
      
      expect(screen.getByText(/garansi uang kembali 7 hari/i)).toBeInTheDocument();
    });

    it('should show upgrade answer content when expanded', () => {
      render(<FaqSection />);
      
      const upgradeQuestion = screen.getByText(/apakah bisa upgrade paket/i);
      fireEvent.click(upgradeQuestion);
      
      expect(screen.getByText(/upgrade resource \(cpu, ram, storage\)/i)).toBeInTheDocument();
      expect(screen.getByText(/tanpa install ulang os/i)).toBeInTheDocument();
    });

    it('should collapse FAQ when clicked again', () => {
      render(<FaqSection />);
      
      const firstQuestion = screen.getByText(/apakah server ini berlokasi di indonesia/i);
      
      // Expand
      fireEvent.click(firstQuestion);
      expect(screen.getByText(/seluruh armada server kami berlokasi di jakarta/i)).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(firstQuestion);
      expect(screen.queryByText(/seluruh armada server kami berlokasi di jakarta/i)).not.toBeInTheDocument();
    });

    it('should only show one answer at a time (single accordion)', () => {
      render(<FaqSection />);
      
      // Open first question
      const firstQuestion = screen.getByText(/apakah server ini berlokasi di indonesia/i);
      fireEvent.click(firstQuestion);
      expect(screen.getByText(/seluruh armada server kami berlokasi di jakarta/i)).toBeInTheDocument();
      
      // Open second question - first should close
      const secondQuestion = screen.getByText(/metode pembayaran apa saja yang diterima/i);
      fireEvent.click(secondQuestion);
      
      expect(screen.queryByText(/seluruh armada server kami berlokasi di jakarta/i)).not.toBeInTheDocument();
      expect(screen.getByText(/kami menerima qris/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have section with faq id', () => {
      render(<FaqSection />);
      const section = document.getElementById('faq');
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe('SECTION');
    });

    it('should have proper heading hierarchy', () => {
      render(<FaqSection />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });

    it('should have clickable FAQ triggers', () => {
      render(<FaqSection />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
