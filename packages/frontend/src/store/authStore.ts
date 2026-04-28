import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'campaign-manager-auth',
      // Only persist token + user — no functions
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);

/** Selector for the most common case — boolean "is the user logged in?" */
export const useIsAuthenticated = (): boolean =>
  useAuthStore((s) => Boolean(s.token));
