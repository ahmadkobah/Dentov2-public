/**
 * Centralized date formatting utility.
 *
 * The tenant dateFormat is fetched from /api/tenant-settings/clinic
 * at app startup (via DashboardLayout sync) and persisted to
 * localStorage so it survives page refreshes.
 *
 * Mirrors the currency.ts pattern.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  formatDate as sharedFormatDate,
  formatDateTime as sharedFormatDateTime,
} from '@dento/shared';

// ── Date Format Store (persisted to localStorage) ───────

interface DateFormatStore {
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
}

export const useDateFormatStore = create<DateFormatStore>()(
  persist(
    (set) => ({
      dateFormat: 'DD/MM/YYYY',
      setDateFormat: (dateFormat) => set({ dateFormat }),
    }),
    { name: 'tenant-date-format' },
  ),
);

// ── Pure helpers (safe outside React) ───────────────────

export function getDateFormat(): string {
  return useDateFormatStore.getState().dateFormat || 'DD/MM/YYYY';
}

export function formatDate(date: string | Date): string {
  return sharedFormatDate(date, getDateFormat());
}

export function formatDateTime(date: string | Date): string {
  return sharedFormatDateTime(date, `${getDateFormat()} HH:mm`);
}

// ── React Hook ──────────────────────────────────────────

export function useDateFormat() {
  const dateFormat = useDateFormatStore((s) => s.dateFormat);

  return {
    dateFormat,
    formatDate: (date: string | Date) => sharedFormatDate(date, dateFormat),
    formatDateTime: (date: string | Date) => sharedFormatDateTime(date, `${dateFormat} HH:mm`),
  };
}
