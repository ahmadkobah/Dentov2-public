import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WebhookStatus = 'active' | 'disabled' | 'failed';

export interface WebhookEndpoint {
  _id: string;
  url: string;
  name: string;
  description: string;
  status: WebhookStatus;
  events: string[];
  isActive: boolean;
  successRate: number;
  totalDeliveries: number;
  consecutiveFailures: number;
  lastDeliveryAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  _id: string;
  endpointId: string;
  event: string;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  httpStatus: number | null;
  duration: number | null;
  attempts: number;
  error: string | null;
  createdAt: string;
}

export interface WebhookFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface DeliveryFilters {
  status?: string;
  event?: string;
  page?: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface WebhookListResponse {
  success: boolean;
  data: {
    data: WebhookEndpoint[];
    pagination: PaginationMeta;
  };
}

interface WebhookDetailResponse {
  success: boolean;
  data: { webhook: WebhookEndpoint };
}

interface DeliveryListResponse {
  success: boolean;
  data: {
    data: WebhookDelivery[];
    pagination: PaginationMeta;
  };
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
  deliveries: (id: string) => [...webhookKeys.all, 'deliveries', id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useWebhooks(filters: WebhookFilters = {}) {
  return useQuery({
    queryKey: webhookKeys.list(filters),
    queryFn: () =>
      apiClient.get<WebhookListResponse>('/api/tenant-webhooks', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: res.data.data,
      pagination: res.data.pagination,
    }),
  });
}

export function useWebhookDetail(id: string) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => apiClient.get<WebhookDetailResponse>(`/api/tenant-webhooks/${id}`),
    select: (res) => res.data.webhook,
    enabled: !!id,
  });
}

export function useWebhookDeliveries(id: string, filters: DeliveryFilters = {}) {
  return useQuery({
    queryKey: webhookKeys.deliveries(id),
    queryFn: () =>
      apiClient.get<DeliveryListResponse>(`/api/tenant-webhooks/${id}/deliveries`, {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: res.data.data,
      pagination: res.data.pagination,
    }),
    enabled: !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; url: string; description?: string; events: string[] }) =>
      apiClient.post('/api/tenant-webhooks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook endpoint created');
    },
    onError: () => {
      toast.error('Failed to create webhook');
    },
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.patch(`/api/tenant-webhooks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: webhookKeys.all });
      toast.success('Webhook updated');
    },
    onError: () => {
      toast.error('Failed to update webhook');
    },
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/tenant-webhooks/${id}`),
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
    mutationFn: (id: string) => apiClient.post(`/api/tenant-webhooks/${id}/test`),
    onSuccess: () => {
      toast.success('Test delivery sent');
    },
    onError: () => {
      toast.error('Test delivery failed');
    },
  });
}
