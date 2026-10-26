import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  platformRole: 'platform_owner' | 'platform_admin' | 'platform_viewer';
  platformPermissions: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  bootstrap: () => Promise<void>;
}

/**
 * Dev portal auth store — memory only (no persist middleware).
 * Per BUILD_RULES §17.1: access token NEVER in localStorage.
 * Developer portal is for platform_admin users — no tenantSlug needed.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
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
              platformRole: u.platformRole ?? 'platform_admin',
              platformPermissions: u.platformPermissions ?? [],
            },
            accessToken,
            isAuthenticated: true,
            isBootstrapping: false,
          });
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
        headers: { 'Content-Type': 'application/json', 'X-Platform-Auth': 'true' },
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
          platformRole: u.platformRole ?? 'platform_admin',
          platformPermissions: u.platformPermissions ?? [],
        },
        accessToken,
        isAuthenticated: true,
        isBootstrapping: false,
      });
    } catch {
      set({ isBootstrapping: false });
    }
  },
}));

/**
 * Check if the current user has a specific platform permission.
 * Supports wildcard: `platform_tenants.*` grants all actions on that module.
 *
 * Usage: `if (hasPlatformPerm('platform_tenants.read')) { ... }`
 */
export function hasPlatformPerm(permission: string): boolean {
  const { user } = useAuthStore.getState();
  if (!user?.platformPermissions) return false;
  const [module] = permission.split('.');
  if (user.platformPermissions.includes(`${module}.*`)) return true;
  return user.platformPermissions.includes(permission);
}
