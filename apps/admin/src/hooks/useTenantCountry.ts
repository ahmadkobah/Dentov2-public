import { CURRENCY_TO_COUNTRY } from '@dento/ui';
import { useSettingsByKey } from '../features/settings/hooks/useTenantSettings.js';

/**
 * Returns the tenant's default country ISO code (e.g. "SA")
 * derived from the clinic settings currency.
 * Falls back to "SA" if unknown.
 */
export function useTenantCountry(): string {
  const { data: clinic } = useSettingsByKey('clinic');
  const currency = clinic?.currency ?? 'SAR';
  return CURRENCY_TO_COUNTRY[currency] ?? 'SA';
}
