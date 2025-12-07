import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark'; // Default to dark if SSR or no preference
};

/**
 * Theme store with Zustand
 * Default theme respects system preference
 * Persists theme preference to localStorage
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'admin-theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useThemeStore;
