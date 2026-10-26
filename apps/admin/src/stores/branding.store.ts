import { create } from 'zustand';

/**
 * Branding Store — §14 Logo & Branding Propagation
 *
 * Manages tenant branding state (logo, colors, clinic info)
 * that propagates across the admin portal:
 * - Sidebar: dynamic logo (light/dark)
 * - Browser tab: dynamic favicon + clinic name as title
 * - Document headers: via ClinicHeader component
 *
 * No localStorage persistence — branding is always fetched fresh
 * from the API so presigned URLs stay valid and branding works
 * across browsers/devices.
 */

export type LogoSize = 'small' | 'medium' | 'large';
export type LogoAlignment = 'left' | 'center' | 'right';
export type LogoLayout = 'logo-left' | 'logo-top' | 'logo-only';

export interface BrandingState {
  // Logo
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;

  // Logo Display
  logoSize: LogoSize;
  logoAlignment: LogoAlignment;
  logoLayout: LogoLayout;

  // Clinic Info
  clinicName: { en: string; ar?: string };
  phone: string;
  email: string;
  website: string;
  address: { main: { en: string; ar?: string }; branchId?: string };

  // Colors
  primaryColor: string;
  accentColor: string;

  // Loading state
  isLoaded: boolean;

  // Actions
  setBranding: (branding: Partial<BrandingState>) => void;
  resetBranding: () => void;
  applyFavicon: () => void;
  applyTitle: () => void;
}

const DEFAULT_STATE = {
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  logoSize: 'medium' as LogoSize,
  logoAlignment: 'left' as LogoAlignment,
  logoLayout: 'logo-left' as LogoLayout,
  clinicName: { en: 'Dento', ar: '' },
  phone: '',
  email: '',
  website: '',
  address: { main: { en: '', ar: '' } },
  primaryColor: '#4f46e5',
  accentColor: '#10b981',
  isLoaded: false,
};

export const useBrandingStore = create<BrandingState>()((set, get) => ({
  ...DEFAULT_STATE,

  setBranding: (branding) => {
    set({ ...branding, isLoaded: true });
    // Auto-propagate favicon and title when branding changes
    setTimeout(() => {
      get().applyFavicon();
      get().applyTitle();
    }, 0);
  },

  resetBranding: () => {
    set({ ...DEFAULT_STATE, isLoaded: true });
  },

  applyFavicon: () => {
    const { faviconUrl } = get();
    if (typeof document === 'undefined') return;

    const link =
      (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
      document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl || '/favicon.ico';
    if (!link.parentNode) {
      document.head.appendChild(link);
    }
  },

  applyTitle: () => {
    const { clinicName } = get();
    if (typeof document === 'undefined') return;

    const name = clinicName.en || 'Dento';
    document.title = `${name} — Admin Portal`;
  },
}));
