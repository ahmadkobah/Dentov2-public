/**
 * Notification Preferences React Query Hooks
 *
 * API: GET/PATCH /api/notifications/preferences
 * Manages per-user channel toggles, category settings, quiet hours, and digest mode.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth.store.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

type ChannelKey = 'email' | 'sms' | 'whatsapp' | 'push' | 'inApp';

export interface ChannelPreference {
  isEnabled: boolean;
  address?: string;
  phone?: string;
}

export interface CategoryPreference {
  isEnabled: boolean;
  channels: ChannelKey[];
}

export interface NotificationPreferences {
  _id: string | null;
  userId: string;
  tenantId: string;
  channels: Record<ChannelKey, ChannelPreference>;
  categories: Record<string, CategoryPreference>;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string | null;
  digestMode: 'realtime' | 'daily' | 'weekly';
  digestTime: string | null;
  soundPreset: 'chime' | 'bell' | 'drop' | 'pulse' | 'none';
}

export type UpdatePreferencesInput = {
  channels?: Partial<Record<ChannelKey, { isEnabled: boolean; address?: string; phone?: string }>>;
  categories?: Record<string, { isEnabled: boolean; channels: ChannelKey[] }>;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
  digestMode?: 'realtime' | 'daily' | 'weekly';
  digestTime?: string;
  soundPreset?: 'chime' | 'bell' | 'drop' | 'pulse' | 'none';
};

// ── Query Keys ──────────────────────────────────────────────

export const preferencesKeys = {
  all: ['notification-preferences'] as const,
  detail: () => [...preferencesKeys.all, 'detail'] as const,
};

// ── Query Hook ──────────────────────────────────────────────

export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: preferencesKeys.detail(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<NotificationPreferences>>('/api/notifications/preferences'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

// ── Mutation Hook ───────────────────────────────────────────

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePreferencesInput) =>
      apiClient.patch<ApiSuccessResponse<NotificationPreferences>>(
        '/api/notifications/preferences',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: preferencesKeys.all });
      toast.success('Notification preferences updated');
    },
    onError: () => {
      toast.error('Failed to update preferences');
    },
  });
}
