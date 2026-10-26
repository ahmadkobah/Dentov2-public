import { useEffect, useRef } from 'react';
import { useBrandingStore } from '../stores/branding.store.js';
import { generateColorScale, applyColorScaleToElement } from '../utils/color-scale.js';
import { useAuthStore } from '../stores/auth.store.js';

/**
 * useBrandingTheme — Clinic App Hook (§14)
 *
 * On mount, fetches branding config from GET /api/branding and injects
 * the tenant's primaryColor + accentColor as --color-brand-* CSS variables
 * on <html>, enabling runtime theme customization per tenant.
 *
 * If no branding is configured (or fetch fails), the default green theme
 * from globals.css is used (no CSS variables are set).
 *
 * Usage: Call once at the app root (e.g., in App.tsx or DashboardLayout.tsx).
 *
 * ```tsx
 * function App() {
 *   useBrandingTheme();
 *   return <RouterProvider router={router} />;
 * }
 * ```
 */
export function useBrandingTheme(): void {
  const { primaryColor, isLoaded, setBranding } = useBrandingStore();
  const appliedRef = useRef<string | null>(null);

  // ── Fetch branding when store is not loaded (fresh mount or HMR reset) ──
  useEffect(() => {
    if (isLoaded) return;

    const controller = new AbortController();

    async function fetchBranding() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const { accessToken, tenantSlug } = useAuthStore.getState();
        const headers: Record<string, string> = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
        if (tenantSlug) headers['X-Tenant-Slug'] = tenantSlug;
        const res = await fetch(`${apiUrl}/api/branding`, {
          signal: controller.signal,
          headers,
          credentials: 'include',
        });
        if (!res.ok) return;

        const json = await res.json();
        const branding = json?.data?.branding;

        if (branding) {
          setBranding({
            logoUrl: branding.logoUrl ?? null,
            logoDarkUrl: branding.logoDarkUrl ?? null,
            faviconUrl: branding.faviconUrl ?? null,
            logoSize: branding.logoSize ?? 'medium',
            logoAlignment: branding.logoAlignment ?? 'left',
            logoLayout: branding.logoLayout ?? 'logo-left',
            clinicName: branding.clinicName ?? { en: 'Dento' },
            phone: branding.phone ?? '',
            email: branding.email ?? '',
            website: branding.website ?? '',
            address: branding.address ?? { main: { en: '' } },
            primaryColor: branding.primaryColor ?? '#16a34a',
            accentColor: branding.accentColor ?? '#10b981',
          });
        }
      } catch {
        // Silently fail — defaults from CSS are used
      }
    }

    fetchBranding();
    return () => controller.abort();
  }, [isLoaded, setBranding]);

  // ── Apply primary color as CSS variables when it changes ─────
  useEffect(() => {
    if (!primaryColor || primaryColor === appliedRef.current) return;

    // Default green — don't override CSS (it matches the static theme)
    const DEFAULT_PRIMARY = '#16a34a';
    if (primaryColor === DEFAULT_PRIMARY) {
      appliedRef.current = primaryColor;
      return;
    }

    // Generate a full color scale from the tenant's chosen color
    const scale = generateColorScale(primaryColor);

    // Inject as --color-brand-* on <html> so all Tailwind utilities update
    applyColorScaleToElement(document.documentElement, '--color-brand', scale);

    appliedRef.current = primaryColor;
  }, [primaryColor]);
}
