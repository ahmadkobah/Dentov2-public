import { create } from 'zustand';
import { useThemeStore } from './theme.store.js';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  languagePreference?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  tenantSlug: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setAuth: (user: User, accessToken: string, tenantSlug: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  bootstrap: () => Promise<void>;
}

/**
 * Auth store — memory only (no persist middleware).
 * Per BUILD_RULES §17.1: access token NEVER in localStorage.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  tenantSlug: null,
  isAuthenticated: false,
  isBootstrapping: true,
  setAuth: (user, accessToken, tenantSlug) =>
    set({ user, accessToken, tenantSlug, isAuthenticated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null, tenantSlug: null, isAuthenticated: false }),
  bootstrap: async () => {
    // Check localStorage for pre-loaded auth data (e.g., from E2E auth setup)
    try {
      const stored = localStorage.getItem('__auth_bootstrap');
      if (stored) {
        const { accessToken, user: u } = JSON.parse(stored);
        if (accessToken && u) {
          set({
            user: {
              id: u.id,
              email: u.email,
              firstName: u.profile?.firstName?.en || '',
              lastName: u.profile?.lastName?.en || '',
              role: u.role,
              languagePreference: u.profile?.languagePreference,
            },
            accessToken,
            tenantSlug: u.tenantSlug,
            isAuthenticated: true,
            isBootstrapping: false,
          });
          if (u.profile?.languagePreference) {
            useThemeStore.getState().setLocale(u.profile.languagePreference as 'en' | 'ar');
          }
          return;
        }
      }
    } catch {
      /* ignore parse errors */
    }

    // Fall back to refresh-based bootstrap
    const apiUrl = import.meta.env.VITE_API_URL || '';
    try {
      const refreshRes = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'include',
      });
      if (!refreshRes.ok) {
        set({ isBootstrapping: false });
        return;
      }
      const refreshJson = await refreshRes.json();
      const accessToken: string | undefined = refreshJson.data?.accessToken;
      if (!accessToken) {
        set({ isBootstrapping: false });
        return;
      }

      const meRes = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!meRes.ok) {
        set({ isBootstrapping: false });
        return;
      }
      const meJson = await meRes.json();
      const u = meJson.data;

      set({
        user: {
          id: u.id,
          email: u.email,
          firstName: u.profile?.firstName?.en || '',
          lastName: u.profile?.lastName?.en || '',
          role: u.role,
          languagePreference: u.profile?.languagePreference,
        },
        accessToken,
        tenantSlug: u.tenantSlug,
        isAuthenticated: true,
        isBootstrapping: false,
      });
      if (u.profile?.languagePreference) {
        useThemeStore.getState().setLocale(u.profile.languagePreference as 'en' | 'ar');
      }
    } catch {
      set({ isBootstrapping: false });
    }
  },
}));
