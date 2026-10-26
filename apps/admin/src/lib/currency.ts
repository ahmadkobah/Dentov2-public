/**
 * Centralized currency formatting utility.
 *
 * The tenant currency is fetched from /api/tenant-settings/clinic
 * at app startup (via useSyncTenantCurrency in DashboardLayout) and
 * persisted to localStorage so it survives page refreshes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Currency Store (persisted to localStorage) ──────────

interface CurrencyStore {
  currency: string;
  setCurrency: (code: string) => void;
  taxPercentage: number;
  taxEnabled: boolean;
  setTax: (enabled: boolean, percentage: number) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'SAR',
      setCurrency: (currency) => set({ currency }),
      taxPercentage: 0,
      taxEnabled: false,
      setTax: (taxEnabled, taxPercentage) => set({ taxEnabled, taxPercentage }),
    }),
    { name: 'tenant-currency' },
  ),
);

// ── Default Currency ────────────────────────────────────

/**
 * Returns the tenant-configured default currency code.
 * Safe to call outside React (reads Zustand store directly).
 */
export function getDefaultCurrency(): string {
  return useCurrencyStore.getState().currency || 'SAR';
}

// ── Formatting ──────────────────────────────────────────

/**
 * Format a monetary amount with the correct currency symbol.
 *
 * @param amount  - Numeric value to format.
 * @param currency - ISO 4217 currency code.  Falls back to tenant setting.
 */
export function formatCurrency(amount: number, currency?: string): string {
  const code = currency || getDefaultCurrency();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ── React Hook (convenience) ────────────────────────────

/**
 * React hook returning the current tenant currency code.
 * Triggers a re-render when the currency setting changes.
 */
export function useTenantCurrency(): string {
  return useCurrencyStore((s) => s.currency) || 'SAR';
}

// ── Tax Rate Helpers ────────────────────────────────────

/**
 * Returns the tenant-configured default tax percentage.
 * Safe to call outside React (reads Zustand store directly).
 */
export function getDefaultTaxRate(): number {
  const { taxEnabled, taxPercentage } = useCurrencyStore.getState();
  return taxEnabled ? taxPercentage : 0;
}

/**
 * React hook returning the current tenant tax percentage.
 * Returns 0 when tax is disabled.
 */
export function useTenantTaxRate(): number {
  const taxEnabled = useCurrencyStore((s) => s.taxEnabled);
  const taxPercentage = useCurrencyStore((s) => s.taxPercentage);
  return taxEnabled ? taxPercentage : 0;
}
