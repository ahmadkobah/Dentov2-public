import dayjs from 'dayjs';

// ── Currency Formatting ─────────────────────────────────────

export function formatCurrency(
  amount: number,
  locale: string = 'en-EG',
  currency: string = 'EGP',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── Date Formatting ─────────────────────────────────────────

export function formatDate(date: string | Date, format: string = 'DD/MM/YYYY'): string {
  return dayjs(date).format(format);
}

export function formatDateTime(date: string | Date, format: string = 'DD/MM/YYYY HH:mm'): string {
  return dayjs(date).format(format);
}

export function diffDays(start: string | Date, end: string | Date): number {
  return dayjs(end).diff(dayjs(start), 'day');
}

// ── String Utilities ────────────────────────────────────────

export function truncate(str: string, length: number = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Validation Helpers ──────────────────────────────────────

export function isValidEgyptianPhone(phone: string): boolean {
  return /^(\+?20)?01[0125]\d{8}$/.test(phone.replace(/\s/g, ''));
}

// ── Localization Helpers ────────────────────────────────────

/** Bilingual field shape used across all models */
export interface MultiLangField {
  en: string;
  ar?: string;
  [key: string]: string | undefined;
}

/**
 * Resolve a bilingual field to the best available string for the given locale.
 * Falls back to `en` when the requested locale is empty/missing.
 *
 * @example
 * localized(patient.firstName, 'ar')  // → "أحمد" or "Ahmad" if ar is empty
 * localized(service.name, locale)     // → uses current locale with en fallback
 */
export function localized(field: MultiLangField | null | undefined, locale: string = 'en'): string {
  if (!field) return '';
  if (locale !== 'en' && field[locale]) return field[locale]!;
  return field.en ?? '';
}

/**
 * Build a full display name from bilingual first/last name fields.
 *
 * @example
 * localizedName(user.firstName, user.lastName, 'ar')
 */
export function localizedName(
  firstName: MultiLangField | null | undefined,
  lastName: MultiLangField | null | undefined,
  locale: string = 'en',
): string {
  return [localized(firstName, locale), localized(lastName, locale)].filter(Boolean).join(' ');
}

// ── Pagination Helpers ──────────────────────────────────────

export function buildPaginationParams(
  page: number = 1,
  limit: number = 20,
): { skip: number; limit: number } {
  return {
    skip: (page - 1) * limit,
    limit,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
