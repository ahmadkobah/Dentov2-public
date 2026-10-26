/**
 * useTenantSettings — React Query hooks for Tenant Settings CRUD
 *
 * Per MOCK_DATA_REMOVAL_PLAN.md Step 2.3
 * Endpoints: GET /, GET /:key, PATCH /:key, POST /:key/reset
 *
 * 6 setting keys: clinic, appointment, billing, notifications, security, inventory
 * Types imported from @dento/shared (Zod-inferred).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';
import type { ApiSuccessResponse } from '../../../lib/types.js';
import type {
  SettingsKey,
  ClinicSettings,
  AppointmentSettings,
  BillingSettings,
  NotificationSettings,
  SecuritySettings,
  InventorySettings,
  ProvidersSettings,
  BookingWidgetSettings,
  WhatsAppBotSettings,
} from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Settings type map                                                  */
/* ------------------------------------------------------------------ */

/** Maps each settings key to its strongly-typed value object. */
export interface SettingsMap {
  clinic: ClinicSettings;
  appointment: AppointmentSettings;
  billing: BillingSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  inventory: InventorySettings;
  providers: ProvidersSettings;
  bookingWidget: BookingWidgetSettings;
  whatsappBot: WhatsAppBotSettings;
}

/** All settings merged into one object (keyed by category). */
export type AllSettings = {
  [K in SettingsKey]?: SettingsMap[K];
};

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const settingsKeys = {
  all: ['tenant-settings'] as const,
  lists: () => [...settingsKeys.all, 'list'] as const,
  byKey: (key: SettingsKey) => [...settingsKeys.all, key] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** Fetch all settings categories merged with defaults. */
export function useAllSettings() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.lists(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ settings: AllSettings }>>('/api/tenant-settings'),
    select: (res) => res.data.settings,
    enabled: isAuthenticated,
  });
}

/** Fetch a single settings category by key (strongly-typed). */
export function useSettingsByKey<K extends SettingsKey>(key: K) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: settingsKeys.byKey(key),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ key: K; settings: SettingsMap[K] }>>(
        `/api/tenant-settings/${key}`,
      ),
    select: (res) => res.data.settings,
    enabled: !!key && isAuthenticated,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Update a single settings category (admin only). */
export function useUpdateSettings<K extends SettingsKey>(key: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: Partial<SettingsMap[K]>) =>
      apiClient.patch<ApiSuccessResponse<{ key: K; settings: SettingsMap[K] }>>(
        `/api/tenant-settings/${key}`,
        values,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.byKey(key) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
}

/** Reset a settings category to defaults (admin only). */
export function useResetSettings<K extends SettingsKey>(key: K) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.post<ApiSuccessResponse<{ key: K; settings: SettingsMap[K] }>>(
        `/api/tenant-settings/${key}/reset`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.byKey(key) });
      queryClient.invalidateQueries({ queryKey: settingsKeys.lists() });
      toast.success('Settings reset to defaults');
    },
    onError: () => {
      toast.error('Failed to reset settings');
    },
  });
}
