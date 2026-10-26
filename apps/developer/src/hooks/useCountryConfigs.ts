import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import type { CountryConfig } from '@dento/shared';
import type { CreateCountryConfigInput, UpdateCountryConfigInput } from '@dento/shared';
import { toast } from '@dento/ui';

interface CountryConfigResponse {
  success: true;
  data: { countries: CountryConfig[] };
}

interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
}

export const countryConfigKeys = {
  all: ['country-configs'] as const,
  list: () => [...countryConfigKeys.all, 'list'] as const,
  platform: () => [...countryConfigKeys.all, 'platform'] as const,
};

export function useCountryConfigs() {
  return useQuery({
    queryKey: countryConfigKeys.list(),
    queryFn: () => apiClient.get<CountryConfigResponse>('/api/countries'),
    select: (res) => res.data.countries,
    staleTime: 1000 * 60 * 60, // 1 hour — country list rarely changes
  });
}

/** Fetch ALL country configs (including inactive) for admin management */
export function usePlatformCountryConfigs() {
  return useQuery({
    queryKey: countryConfigKeys.platform(),
    queryFn: async () => {
      const response =
        await apiClient.get<ApiSuccessResponse<CountryConfig[]>>('/api/platform/countries');
      return response.data;
    },
    staleTime: 60_000,
  });
}

export function useCreateCountryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCountryConfigInput) => {
      const response = await apiClient.post<ApiSuccessResponse<CountryConfig>>(
        '/api/platform/countries',
        input,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryConfigKeys.all });
      toast.success('Country created');
    },
    onError: () => {
      toast.error('Failed to create country');
    },
  });
}

export function useUpdateCountryConfig(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCountryConfigInput) => {
      const response = await apiClient.patch<ApiSuccessResponse<CountryConfig>>(
        `/api/platform/countries/${code}`,
        input,
      );
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryConfigKeys.all });
      toast.success('Country updated');
    },
    onError: () => {
      toast.error('Failed to update country');
    },
  });
}

export function useDeleteCountryConfig(code: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/platform/countries/${code}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: countryConfigKeys.all });
      toast.success('Country deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate country');
    },
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
