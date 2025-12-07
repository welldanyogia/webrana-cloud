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

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Will be overridden by persist middleware

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // After hydration, check if we should use system preference
        if (state && typeof window !== 'undefined') {
          const stored = localStorage.getItem('theme-storage');
          if (!stored) {
            // No stored preference, use system
            const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
            state.setTheme(systemTheme);
          }
        }
      },
    }
  )
);

export default useThemeStore;
