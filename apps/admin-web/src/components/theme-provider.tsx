'use client';

import { useEffect, useRef } from 'react';
import { useThemeStore } from '@/stores/theme-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider component that applies the theme class to the document.
 * Default theme is DARK.
 * Handles hydration to prevent flash of wrong theme.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useThemeStore();
  const mountedRef = useRef(false);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Mark as mounted
    mountedRef.current = true;
  }, [theme]);

  return <>{children}</>;
}

export default ThemeProvider;
