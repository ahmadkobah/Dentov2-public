/**
 * Notification Template React Query Hooks
 *
 * Per ADMIN_PORTAL_SCREENS.md §20 — Notification Templates Management
 * API: /api/notifications/templates (CRUD)
 *
 * Pattern: query key factory → useQuery → useMutation + invalidateQueries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

export interface NotificationTemplate {
  _id: string;
  key: string;
  name: { en: string; ar: string };
  description?: string;
  category: string;
  trigger: 'automatic' | 'manual' | 'scheduled';
  channels: {
    email?: {
      isEnabled: boolean;
      subject?: { en: string; ar: string };
      body?: { en: string; ar: string };
    };
    sms?: { isEnabled: boolean; template?: { en: string; ar: string } };
    whatsapp?: { isEnabled: boolean; template?: { en: string; ar: string }; templateId?: string };
    push?: {
      isEnabled: boolean;
      title?: { en: string; ar: string };
      body?: { en: string; ar: string };
    };
    inApp?: {
      isEnabled: boolean;
      title?: { en: string; ar: string };
      body?: { en: string; ar: string };
      icon?: string;
      actionUrl?: string;
    };
  };
  variables: Array<{ key: string; label: { en: string; ar: string }; isRequired: boolean }>;
  schedule?: { beforeMinutes?: number; afterMinutes?: number; cronExpression?: string };
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateTemplateInput = Partial<NotificationTemplate> & {
  key: string;
  name: { en: string; ar: string };
  category: string;
  trigger: string;
  channels: NotificationTemplate['channels'];
};

export type UpdateTemplateInput = Partial<
  Omit<NotificationTemplate, '_id' | 'createdAt' | 'updatedAt' | 'isSystem'>
>;

// ── Query Keys ──────────────────────────────────────────────

export const templateKeys = {
  all: ['notification-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: () => [...templateKeys.lists()] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
};

// ── Query Hooks ─────────────────────────────────────────────

export function useNotificationTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<NotificationTemplate[]>>('/api/notifications/templates'),
    select: (res) => res.data,
  });
}

export function useNotificationTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<NotificationTemplate>>(`/api/notifications/templates/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

// ── Mutation Hooks ──────────────────────────────────────────

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateInput) =>
      apiClient.post<ApiSuccessResponse<NotificationTemplate>>(
        '/api/notifications/templates',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template created');
    },
    onError: () => {
      toast.error('Failed to create template');
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      apiClient.patch<ApiSuccessResponse<NotificationTemplate>>(
        `/api/notifications/templates/${id}`,
        data,
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: templateKeys.lists() });
      qc.invalidateQueries({ queryKey: templateKeys.detail(vars.id) });
      toast.success('Template updated');
    },
    onError: () => {
      toast.error('Failed to update template');
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ deleted: boolean }>>(
        `/api/notifications/templates/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: templateKeys.lists() });
      toast.success('Template deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate template');
    },
  });
}
