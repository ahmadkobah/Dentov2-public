/**
 * Locale Store — Zustand
 *
 * Manages i18n state:
 * - Current locale
 * - Direction (ltr/rtl)
 * - Translations (bundled fallback + API override)
 *
 * Per MASTER_PLAN §26 - i18n System
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { bundledTranslations } from '../i18n/bundled-translations.js';

export type Direction = 'ltr' | 'rtl';

interface LocaleState {
  locale: string;
  direction: Direction;
  translations: Record<string, Record<string, string>>; // namespace -> key -> value
  isLoading: boolean;
  error: string | null;

  // Actions
  setLocale: (locale: string) => void;
  loadTranslations: (locale: string) => Promise<void>;
  t: (key: string, params?: Record<string, string | number> | string) => string;
}

// RTL locales
const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      direction: 'ltr',
      translations: bundledTranslations,
      isLoading: false,
      error: null,

      setLocale: (locale) => {
        const direction: Direction = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';

        // Update document direction
        document.documentElement.dir = direction;
        document.documentElement.lang = locale;

        set({ locale, direction });

        // Load translations for new locale from API (overrides bundled)
        get().loadTranslations(locale);
      },

      loadTranslations: async (locale) => {
        // Bundled translations already cover English — skip API call
        if (locale === 'en') {
          set({ translations: { ...bundledTranslations }, isLoading: false, error: null });
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`/api/translations/${locale}`);

          if (!response.ok) {
            throw new Error('Failed to load translations');
          }

          const data = await response.json();

          // Start from bundled English as base, then merge API data
          // API keys may include the namespace prefix (e.g. "dashboard.title")
          // but t() expects stripped keys (e.g. "title"), so strip the prefix at merge time.
          const translations: Record<string, Record<string, string>> = {
            ...bundledTranslations,
          };
          for (const pack of data.data?.packs || []) {
            const prefix = `${pack.namespace}.`;
            const stripped: Record<string, string> = {};
            for (const [k, v] of Object.entries(pack.translations as Record<string, string>)) {
              stripped[k.startsWith(prefix) ? k.slice(prefix.length) : k] = v;
            }
            translations[pack.namespace] = {
              ...(translations[pack.namespace] || {}),
              ...stripped,
            };
          }

          set({ translations, isLoading: false });
        } catch (error) {
          console.error('Failed to load translations:', error);
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      t: (key, params) => {
        const { translations } = get();

        // If params is a string, treat as fallback
        const fallback = typeof params === 'string' ? params : undefined;
        const paramsObj = typeof params === 'object' ? params : undefined;

        // Parse namespace from key (e.g., "auth.login.title" -> namespace: "auth", key: "login.title")
        const [namespace, ...rest] = key.split('.');
        const translationKey = rest.join('.');

        // Get translation from namespace
        const value = translations[namespace]?.[translationKey] || fallback || key;

        // Replace parameters: {{name}} -> value
        if (paramsObj) {
          return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) =>
            String(paramsObj[paramKey] ?? `{{${paramKey}}}`),
          );
        }

        return value;
      },
    }),
    {
      name: 'dento-locale',
      version: 2,
      partialize: (state) => ({
        locale: state.locale,
        direction: state.direction,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<LocaleState> | undefined;
        return {
          ...current,
          locale: p?.locale ?? current.locale,
          direction: p?.direction ?? current.direction,
        };
      },
      onRehydrateStorage: () => (state) => {
        // After rehydration, load translations for the persisted locale
        if (state && state.locale !== 'en') {
          state.loadTranslations(state.locale);
        }
      },
    },
  ),
);

// ── Convenience Hooks ───────────────────────────────────────

/**
 * Hook to get current locale and translation function.
 * Usage: const { t, locale, direction } = useLocale();
 */
export function useLocale() {
  const locale = useLocaleStore((s) => s.locale);
  const direction = useLocaleStore((s) => s.direction);
  const t = useLocaleStore((s) => s.t);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const isLoading = useLocaleStore((s) => s.isLoading);

  return { locale, direction, t, setLocale, isLoading };
}

/**
 * Hook to get just the translation function with locale info.
 * Usage: const { t, locale, isRTL } = useTranslation();
 */
export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const direction = useLocaleStore((s) => s.direction);
  const t = useLocaleStore((s) => s.t);
  // Subscribe to translations so components re-render when async load completes
  useLocaleStore((s) => s.translations);

  return { t, locale, isRTL: direction === 'rtl' };
}

/**
 * Hook to toggle between EN and AR.
 * Usage: const toggleLocale = useLocaleToggle();
 */
export function useLocaleToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return () => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  };
}
