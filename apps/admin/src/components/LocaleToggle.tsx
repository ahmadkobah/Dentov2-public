/**
 * Locale Toggle Component
 *
 * Button to switch between EN and AR locales.
 * Updates document direction (LTR/RTL).
 */

import { Languages } from 'lucide-react';
import { Button } from '@dento/ui';
import { useLocale } from '../stores/locale.store';
import { useThemeStore } from '../stores/theme.store';

export function LocaleToggle() {
  const { locale, isLoading } = useLocale();
  // Drive the theme store (source of truth in App.tsx). App.tsx's effect
  // will sync useLocaleStore which loads API translations and sets <html dir>.
  const setThemeLocale = useThemeStore((s) => s.setLocale);

  const toggleLocale = () => {
    setThemeLocale(locale === 'en' ? 'ar' : 'en');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLocale}
      disabled={isLoading}
      aria-label="Toggle language"
      title={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      className="relative"
    >
      <Languages className="h-5 w-5" />
      <span className="absolute -bottom-1 -end-1 text-[10px] font-bold uppercase">
        {locale === 'en' ? 'AR' : 'EN'}
      </span>
    </Button>
  );
}

/**
 * Locale Display Badge
 *
 * Shows current locale with flag indicator.
 */
export function LocaleBadge() {
  const { locale, direction } = useLocale();

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-base">{locale === 'en' ? '🇬🇧' : '🇸🇦'}</span>
      <span className="uppercase font-medium">{locale}</span>
      <span className="text-xs text-muted-foreground">({direction.toUpperCase()})</span>
    </div>
  );
}
