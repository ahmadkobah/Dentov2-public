/**
 * useSystemSettings — TanStack Query hooks for Platform Settings
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 2.7
 * Calls platform-level `/api/platform/settings/*` endpoints.
 * Manages 3 singletons: system settings, branding, currencies.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';
import type {
  SystemSettings,
  Branding,
  Currencies,
  UpdateSystemSettingsInput,
  UpdateBrandingInput,
  UpdateCurrenciesInput,
  PlatformSettingsResponse,
} from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const settingsKeys = {
  all: ['platform-settings'] as const,
  system: () => [...settingsKeys.all, 'system'] as const,
  branding: () => [...settingsKeys.all, 'branding'] as const,
  currencies: () => [...settingsKeys.all, 'currencies'] as const,
  combined: () => [...settingsKeys.all, 'combined'] as const,
};

/* ------------------------------------------------------------------ */
/*  Response Types                                                     */
/* ------------------------------------------------------------------ */

interface SettingsResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface CombinedResponse {
  success: boolean;
  data: PlatformSettingsResponse;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** Fetch all 3 singletons in one call. */
export function useAllPlatformSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.combined(),
    queryFn: () => apiClient.get<CombinedResponse>('/api/platform/settings/all'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

/** Fetch system settings singleton. */
export function useSystemSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.system(),
    queryFn: () => apiClient.get<SettingsResponse<SystemSettings>>('/api/platform/settings/system'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

/** Fetch branding singleton. */
export function useBranding() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.branding(),
    queryFn: () => apiClient.get<SettingsResponse<Branding>>('/api/platform/settings/branding'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

/** Fetch currencies singleton. */
export function useCurrencies() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.currencies(),
    queryFn: () => apiClient.get<SettingsResponse<Currencies>>('/api/platform/settings/currencies'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Update system settings. */
export function useUpdateSystemSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateSystemSettingsInput) =>
      apiClient.patch<SettingsResponse<SystemSettings>>('/api/platform/settings/system', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.system() });
      qc.invalidateQueries({ queryKey: settingsKeys.combined() });
      toast.success('System settings updated');
    },
    onError: () => {
      toast.error('Failed to update system settings');
    },
  });
}

/** Update branding. */
export function useUpdateBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBrandingInput) =>
      apiClient.patch<SettingsResponse<Branding>>('/api/platform/settings/branding', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.branding() });
      qc.invalidateQueries({ queryKey: settingsKeys.combined() });
      toast.success('Branding updated');
    },
    onError: () => {
      toast.error('Failed to update branding');
    },
  });
}

/** Update currencies. */
export function useUpdateCurrencies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCurrenciesInput) =>
      apiClient.patch<SettingsResponse<Currencies>>('/api/platform/settings/currencies', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: settingsKeys.currencies() });
      qc.invalidateQueries({ queryKey: settingsKeys.combined() });
      toast.success('Currencies updated');
    },
    onError: () => {
      toast.error('Failed to update currencies');
    },
  });
}

/** Refresh exchange rates from live API. */
export function useRefreshExchangeRates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<
        SettingsResponse<{
          updated: number;
          baseCurrency: string;
          rates: Array<{ currency: string; rate: number }>;
        }>
      >('/api/platform/settings/currencies/refresh', {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: settingsKeys.currencies() });
      qc.invalidateQueries({ queryKey: settingsKeys.combined() });
      toast.success(`Refreshed ${res.data.updated} exchange rates`);
    },
    onError: () => {
      toast.error('Failed to refresh exchange rates. Check API key or try again later.');
    },
  });
}

/** Fetch all available currency rates for a given base. */
export function useAvailableRates(base: string, enabled = false) {
  return useQuery({
    queryKey: [...settingsKeys.currencies(), 'available', base],
    queryFn: () =>
      apiClient.get<SettingsResponse<{ base: string; rates: Record<string, number> }>>(
        `/api/platform/settings/currencies/available?base=${encodeURIComponent(base)}`,
      ),
    select: (res) => res.data,
    enabled,
    staleTime: 5 * 60_000, // 5 mins
  });
}
