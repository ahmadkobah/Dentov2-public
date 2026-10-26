import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import type { ApiSuccessResponse } from '../lib/types.js';
import type { CountryConfig } from '@dento/shared';

export const countryConfigKeys = {
  all: ['country-configs'] as const,
  list: () => [...countryConfigKeys.all, 'list'] as const,
};

export function useCountryConfigs() {
  return useQuery({
    queryKey: countryConfigKeys.list(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ countries: CountryConfig[] }>>('/api/countries'),
    select: (res) => res.data.countries,
    staleTime: 1000 * 60 * 60, // 1 hour — country list rarely changes
  });
}

/** Derive { code, label } options for country dropdowns */
export function useCountryOptions() {
  const { data: countries = [] } = useCountryConfigs();
  return countries.map((c) => ({ code: c.code, label: c.name, nameArabic: c.nameArabic }));
}

/** Derive unique currency options from country configs */
export function useCurrencyOptions() {
  const { data: countries = [] } = useCountryConfigs();
  const seen = new Set<string>();
  return countries.reduce<{ code: string; symbol: string }[]>((acc, c) => {
    if (!seen.has(c.currency.code)) {
      seen.add(c.currency.code);
      acc.push({ code: c.currency.code, symbol: c.currency.symbol });
    }
    return acc;
  }, []);
}

/** Derive unique timezone options from country configs */
export function useTimezoneOptions() {
  const { data: countries = [] } = useCountryConfigs();
  return [...new Set(countries.map((c) => c.timezone))];
}

/** Derive region options (code + label + currency) for pricing dropdowns */
export function useRegionOptions() {
  const { data: countries = [] } = useCountryConfigs();
  return countries.map((c) => ({
    code: c.code,
    label: c.name,
    currency: c.currency.code,
  }));
}
