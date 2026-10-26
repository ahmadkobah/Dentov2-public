import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

interface ThemeState {
  isDark: boolean;
  isRTL: boolean;
  locale: string;
  toggleDark: () => void;
  toggleRTL: () => void;
  setLocale: (locale: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      isRTL: false,
      locale: 'en',
      toggleDark: () =>
        set((state) => {
          const newDark = !state.isDark;
          document.documentElement.classList.toggle('dark', newDark);
          return { isDark: newDark };
        }),
      toggleRTL: () =>
        set((state) => {
          const newRTL = !state.isRTL;
          document.documentElement.dir = newRTL ? 'rtl' : 'ltr';
          return { isRTL: newRTL };
        }),
      setLocale: (locale) =>
        set(() => {
          const isRTL = RTL_LOCALES.has(locale);
          document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
          document.documentElement.lang = locale;
          return { locale, isRTL };
        }),
    }),
    { name: 'dento-theme' },
  ),
);
