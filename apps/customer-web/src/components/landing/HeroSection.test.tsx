import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  describe('Rendering', () => {
    it('should render the hero section', () => {
      render(<HeroSection />);
      // HeroSection is a section element
      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should display the main heading', () => {
      render(<HeroSection />);
      expect(
        screen.getByRole('heading', { level: 1, name: /deploy cloud vps indonesia/i })
      ).toBeInTheDocument();
    });

    it('should display "Performa Tinggi" highlight text', () => {
      render(<HeroSection />);
      expect(screen.getByText('Performa Tinggi')).toBeInTheDocument();
    });

    it('should display the description text', () => {
      render(<HeroSection />);
      expect(
        screen.getByText(/bangun aplikasi, website, dan startup anda/i)
      ).toBeInTheDocument();
    });

    it('should display the DigitalOcean badge', () => {
      render(<HeroSection />);
      expect(screen.getByText(/powered by digitalocean/i)).toBeInTheDocument();
    });
  });

  describe('CTA Buttons', () => {
    it('should render "Deploy Server Sekarang" button', () => {
      render(<HeroSection />);
      expect(
        screen.getByRole('link', { name: /deploy server sekarang/i })
      ).toBeInTheDocument();
    });

    it('should link to /register for primary CTA', () => {
      render(<HeroSection />);
      const link = screen.getByRole('link', { name: /deploy server sekarang/i });
      expect(link).toHaveAttribute('href', '/register');
    });

    it('should render "Lihat Pilihan Paket" button', () => {
      render(<HeroSection />);
      expect(
        screen.getByRole('link', { name: /lihat pilihan paket/i })
      ).toBeInTheDocument();
    });

    it('should link to #pricing for secondary CTA', () => {
      render(<HeroSection />);
      const link = screen.getByRole('link', { name: /lihat pilihan paket/i });
      expect(link).toHaveAttribute('href', '#pricing');
    });
  });

  describe('Trust Indicators', () => {
    it('should display "99.9% Uptime SLA"', () => {
      render(<HeroSection />);
      expect(screen.getByText('99.9% Uptime SLA')).toBeInTheDocument();
    });

    it('should display "Aktivasi Instan"', () => {
      render(<HeroSection />);
      expect(screen.getByText('Aktivasi Instan')).toBeInTheDocument();
    });

    it('should display "Support Bahasa Indonesia"', () => {
      render(<HeroSection />);
      expect(screen.getByText('Support Bahasa Indonesia')).toBeInTheDocument();
    });
  });

  describe('Hero Image', () => {
    it('should render the dashboard image', () => {
      render(<HeroSection />);
      const image = screen.getByAltText(/dashboard vps webrana/i);
      expect(image).toBeInTheDocument();
    });

    it('should have correct image source', () => {
      render(<HeroSection />);
      const image = screen.getByAltText(/dashboard vps webrana/i);
      expect(image).toHaveAttribute('src', '/images/landing/hero-dashboard.jpg');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic section element', () => {
      render(<HeroSection />);
      const section = document.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<HeroSection />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });
});
