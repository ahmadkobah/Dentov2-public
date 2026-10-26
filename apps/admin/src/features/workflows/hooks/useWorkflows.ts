/**
 * Workflows hooks — Phase 5.1/5.2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

export type WorkflowTrigger =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.completed'
  | 'appointment.cancelled'
  | 'appointment.no_show'
  | 'patient.created'
  | 'patient.updated'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'payment.received'
  | 'treatment_plan.accepted'
  | 'lab_order.delivered'
  | 'inventory.low_stock'
  | 'inventory.expiring'
  | 'schedule.slot_available'
  | 'custom';

export type WorkflowActionType =
  | 'send_notification'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'update_status'
  | 'create_task'
  | 'trigger_webhook'
  | 'schedule_followup'
  | 'log_event';

export interface WorkflowCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'not_exists';
  value: unknown;
}

export interface WorkflowAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
  delayMinutes: number;
}

export interface Workflow {
  _id: string;
  name: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  conditionLogic: 'all' | 'any';
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
  maxExecutionsPerDay: number;
  executionCount?: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecution {
  _id: string;
  workflowRuleId: string;
  trigger: WorkflowTrigger;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  contextSummary?: string;
  createdAt: string;
}

export interface WorkflowQuery {
  isActive?: boolean;
  trigger?: WorkflowTrigger;
  page?: number;
  limit?: number;
}

export interface CreateWorkflowInput {
  name: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  conditionLogic?: 'all' | 'any';
  actions: WorkflowAction[];
  isActive?: boolean;
  priority?: number;
  maxExecutionsPerDay?: number;
}

export type UpdateWorkflowInput = Partial<Omit<CreateWorkflowInput, 'trigger'>>;

export const workflowKeys = {
  all: ['workflows'] as const,
  list: (q: WorkflowQuery) => [...workflowKeys.all, 'list', q] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
  executions: (id?: string) => [...workflowKeys.all, 'executions', id ?? 'all'] as const,
};

export function useWorkflowList(query: WorkflowQuery = {}) {
  return useQuery({
    queryKey: workflowKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const res = await apiClient.get<
        ApiSuccessResponse<{ workflows: Workflow[]; pagination: PaginationMeta }>
      >(`/api/workflows?${params.toString()}`);
      return res.data;
    },
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessResponse<{ workflow: Workflow }>>(
        `/api/workflows/${id}`,
      );
      return res.data.workflow;
    },
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWorkflowInput) =>
      apiClient.post<ApiSuccessResponse<{ workflow: Workflow }>>('/api/workflows', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkflowInput }) =>
      apiClient.patch<ApiSuccessResponse<{ workflow: Workflow }>>(`/api/workflows/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<ApiSuccessResponse<{ workflow: Workflow }>>(`/api/workflows/${id}/toggle`, {
        isActive,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/workflows/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useWorkflowExecutions(workflowId?: string, page = 1, limit = 25) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId),
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      const path = workflowId
        ? `/api/workflows/${workflowId}/executions?${params.toString()}`
        : `/api/workflows/executions?${params.toString()}`;
      const res =
        await apiClient.get<
          ApiSuccessResponse<{ executions: WorkflowExecution[]; pagination: PaginationMeta }>
        >(path);
      return res.data;
    },
  });
}
