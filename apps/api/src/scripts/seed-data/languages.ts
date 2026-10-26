/**
 * Language Seed Data
 *
 * Platform-level language registry.
 * English is the default (always active).
 * Arabic is available as an optional language pack.
 */

export const languageSeedData = [
  {
    code: 'en',
    name: { en: 'English', ar: 'الإنجليزية' },
    direction: 'ltr' as const,
    isActive: true,
    isDefault: true,
  },
  {
    code: 'ar',
    name: { en: 'Arabic', ar: 'العربية' },
    direction: 'rtl' as const,
    isActive: true,
    isDefault: false,
  },
];
