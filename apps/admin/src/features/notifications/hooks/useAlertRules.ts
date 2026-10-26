/**
 * Alert Rules React Query Hooks
 *
 * Per ADMIN_PORTAL_SCREENS.md §20 — Alert Rules Management
 * API: /api/notifications/alert-rules (CRUD)
 *
 * Pattern: query key factory → useQuery → useMutation + invalidateQueries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

export interface AlertRule {
  _id: string;
  name: string | { en: string; ar?: string };
  description?: string;
  isActive: boolean;
  triggerType: string;
  condition?: {
    metric: string;
    operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
    threshold: number;
    timeWindowDays?: number;
  };
  conditions?: Record<string, unknown>;
  scope?: {
    branchId?: string;
    categoryId?: string;
    doctorId?: string;
  };
  actions:
    | Array<{ type: string; target: string[]; channel?: string }>
    | { channels: string[]; recipientRoles?: string[]; templateId?: string };
  thresholds?: {
    warningLevel?: number;
    criticalLevel?: number;
    value?: number;
    comparator?: string;
  };
  schedule?: {
    frequency?: string;
    cronExpression?: string;
  };
  cooldownMinutes?: number;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateAlertRuleInput = {
  name: { en: string; ar?: string };
  triggerType: string;
  conditions?: Record<string, unknown>;
  actions: { channels: string[]; recipientRoles?: string[]; templateId?: string };
  thresholds?: AlertRule['thresholds'];
  schedule?: AlertRule['schedule'];
  isActive?: boolean;
};

export type UpdateAlertRuleInput = Partial<CreateAlertRuleInput>;

// ── Query Keys ──────────────────────────────────────────────

export const alertRuleKeys = {
  all: ['alert-rules'] as const,
  lists: () => [...alertRuleKeys.all, 'list'] as const,
  list: () => [...alertRuleKeys.lists()] as const,
  detail: (id: string) => [...alertRuleKeys.all, 'detail', id] as const,
};

// ── Query Hooks ─────────────────────────────────────────────

export function useAlertRules() {
  return useQuery({
    queryKey: alertRuleKeys.list(),
    queryFn: () => apiClient.get<ApiSuccessResponse<AlertRule[]>>('/api/notifications/alert-rules'),
    select: (res) => res.data,
  });
}

export function useAlertRule(id: string) {
  return useQuery({
    queryKey: alertRuleKeys.detail(id),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<AlertRule>>(`/api/notifications/alert-rules/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

// ── Mutation Hooks ──────────────────────────────────────────

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAlertRuleInput) =>
      apiClient.post<ApiSuccessResponse<AlertRule>>('/api/notifications/alert-rules', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.lists() });
      toast.success('Alert rule created');
    },
    onError: () => {
      toast.error('Failed to create alert rule');
    },
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAlertRuleInput }) =>
      apiClient.patch<ApiSuccessResponse<AlertRule>>(`/api/notifications/alert-rules/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.lists() });
      qc.invalidateQueries({ queryKey: alertRuleKeys.detail(vars.id) });
      toast.success('Alert rule updated');
    },
    onError: () => {
      toast.error('Failed to update alert rule');
    },
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ deleted: boolean }>>(
        `/api/notifications/alert-rules/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.lists() });
      toast.success('Alert rule deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate alert rule');
    },
  });
}
