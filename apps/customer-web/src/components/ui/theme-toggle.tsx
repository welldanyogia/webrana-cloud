'use client';

import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * Theme toggle component that switches between dark and light mode.
 * Uses Sun/Moon icons from lucide-react.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative p-2 rounded-lg transition-colors duration-200',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'hover:bg-[var(--hover-bg)]',
        'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2',
        className
      )}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}

export default ThemeToggle;
