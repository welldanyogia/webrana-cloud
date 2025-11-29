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

/**
 * Theme store with Zustand
 * Default theme is DARK
 * Persists theme preference to localStorage
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // DEFAULT DARK

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useThemeStore;
