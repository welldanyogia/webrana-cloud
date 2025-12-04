import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ThemeToggle } from './theme-toggle';

// Mock the theme store
const mockToggleTheme = vi.fn();
const mockUseThemeStore = vi.fn();

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: () => mockUseThemeStore(),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    mockUseThemeStore.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });
  });

  it('should render theme toggle button', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should render moon icon when theme is light (to switch to dark)', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    // Check for correct aria-label and title
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    expect(button).toHaveAttribute('title', 'Switch to dark mode');
    
    // Check for Moon icon (SVG)
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('lucide-moon');
  });

  it('should render sun icon when theme is dark (to switch to light)', () => {
    mockUseThemeStore.mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggleTheme,
    });

    render(<ThemeToggle />);
    
    // Check for correct aria-label and title
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(button).toHaveAttribute('title', 'Switch to light mode');
    
    // Check for Sun icon (SVG)
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('lucide-sun');
  });

  it('should call toggleTheme when clicked', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should accept custom className', () => {
    render(<ThemeToggle className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should have correct styling classes', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('p-2');
    expect(button).toHaveClass('rounded-lg');
    expect(button).toHaveClass('transition-colors');
  });
});
