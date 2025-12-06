import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  return normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN';
};

/**
 * Admin Auth store with Zustand
 * Persists token and user data to localStorage
 * Validates admin role for access
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user && isAdminRole(user.role),
        }),

      setToken: (token) =>
        set({
          token,
          isAuthenticated: !!token,
        }),

      setAuth: (user, token) => {
        // Validate admin role (case-insensitive)
        if (!isAdminRole(user.role)) {
          console.error('User is not an admin');
          return;
        }
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      isAdmin: () => {
        const user = get().user;
        return isAdminRole(user?.role);
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set loading to false after hydration
        if (state) {
          state.setLoading(false);
        }
      },
    }
  )
);

export default useAuthStore;
