import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { FeaturesSection } from './FeaturesSection';

describe('FeaturesSection', () => {
  describe('Rendering', () => {
    it('should render the features section', () => {
      render(<FeaturesSection />);
      const section = document.getElementById('features');
      expect(section).toBeInTheDocument();
    });

    it('should display the section heading', () => {
      render(<FeaturesSection />);
      expect(
        screen.getByRole('heading', { level: 2, name: /infrastruktur premium, harga lokal/i })
      ).toBeInTheDocument();
    });

    it('should display the section description', () => {
      render(<FeaturesSection />);
      expect(
        screen.getByText(/kami menggunakan teknologi terbaru/i)
      ).toBeInTheDocument();
    });
  });

  describe('Feature Cards', () => {
    it('should render 4 feature cards', () => {
      render(<FeaturesSection />);
      const images = screen.getAllByRole('img');
      expect(images).toHaveLength(4);
    });

    it('should display NVMe Enterprise feature', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('Penyimpanan NVMe Enterprise')).toBeInTheDocument();
      expect(screen.getByText(/performa i\/o hingga 10x lebih cepat/i)).toBeInTheDocument();
    });

    it('should display Data Center Jakarta feature', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('Data Center Jakarta')).toBeInTheDocument();
      expect(screen.getByText(/lokasi server di indonesia/i)).toBeInTheDocument();
    });

    it('should display Instant Deploy feature', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('Instant Deploy')).toBeInTheDocument();
      expect(screen.getByText(/tidak perlu menunggu manual approval/i)).toBeInTheDocument();
    });

    it('should display Payment Methods feature', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('Metode Pembayaran Lengkap')).toBeInTheDocument();
      expect(screen.getByText(/mendukung pembayaran via qris/i)).toBeInTheDocument();
    });
  });

  describe('Feature Images', () => {
    it('should render NVMe image with correct alt text', () => {
      render(<FeaturesSection />);
      const image = screen.getByAltText(/komponen nvme ssd/i);
      expect(image).toBeInTheDocument();
    });

    it('should render location image with correct alt text', () => {
      render(<FeaturesSection />);
      const image = screen.getByAltText(/peta digital indonesia/i);
      expect(image).toBeInTheDocument();
    });

    it('should render speed image with correct alt text', () => {
      render(<FeaturesSection />);
      const image = screen.getByAltText(/ilustrasi roket 3d/i);
      expect(image).toBeInTheDocument();
    });

    it('should render payment image with correct alt text', () => {
      render(<FeaturesSection />);
      const image = screen.getByAltText(/pembayaran qris/i);
      expect(image).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have section with features id', () => {
      render(<FeaturesSection />);
      const section = document.getElementById('features');
      expect(section).toBeInTheDocument();
      expect(section?.tagName).toBe('SECTION');
    });

    it('should have proper heading hierarchy', () => {
      render(<FeaturesSection />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
    });
  });
});
