import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Local types (TODO: migrate to @dento/shared)                       */
/* ------------------------------------------------------------------ */

export type WebhookStatus = 'active' | 'disabled' | 'failing';

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  status: WebhookStatus;
  events: string[];
  secret: string;
  successRate: number;
  totalDeliveries: number;
  lastDeliveryAt: string | null;
  createdAt: string;
}

export interface DeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  httpStatus: number;
  duration: number;
  success: boolean;
  timestamp: string;
}

export interface WebhookFilters {
  search?: string;
  status?: WebhookStatus | 'all';
  page?: number;
  limit?: number;
}

export interface WebhookStats {
  totalEndpoints: number;
  activeEndpoints: number;
  totalDeliveries: string;
  avgSuccessRate: string;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface WebhookListResponse {
  success: boolean;
  data: WebhookEndpoint[];
  meta: PaginationMeta;
}

interface DeliveryListResponse {
  success: boolean;
  data: DeliveryLog[];
  meta: PaginationMeta;
}

interface WebhookStatsResponse {
  success: boolean;
  data: WebhookStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (filters: WebhookFilters) => [...webhookKeys.lists(), filters] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
  deliveries: () => [...webhookKeys.all, 'deliveries'] as const,
  stats: () => [...webhookKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useWebhooks(filters: WebhookFilters) {
  return useQuery({
    queryKey: webhookKeys.list(filters),
    queryFn: () =>
      apiClient.get<WebhookListResponse>('/api/platform/webhooks', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useWebhookDeliveries(search?: string) {
  return useQuery({
    queryKey: [...webhookKeys.deliveries(), { search }] as const,
    queryFn: () =>
      apiClient.get<DeliveryListResponse>('/api/platform/webhooks/deliveries', {
        params: search ? { search } : undefined,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useWebhookStats() {
  return useQuery({
    queryKey: webhookKeys.stats(),
    queryFn: () => apiClient.get<WebhookStatsResponse>('/api/platform/webhooks/stats'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; description: string; events: string[] }) =>
      apiClient.post('/api/platform/webhooks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook endpoint created');
    },
    onError: () => {
      toast.error('Failed to create webhook');
    },
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) =>
      apiClient.patch(`/api/platform/webhooks/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook status updated');
    },
    onError: () => {
      toast.error('Failed to update webhook');
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook deleted');
    },
    onError: () => {
      toast.error('Failed to delete webhook');
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/platform/webhooks/${id}/test`),
    onSuccess: () => {
      toast.success('Test delivery sent');
    },
    onError: () => {
      toast.error('Test delivery failed');
    },
  });
}
