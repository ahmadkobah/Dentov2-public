import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { ApiKeyScope, ApiKeyPermission, PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Local types (extend shared IApiKey for list display)               */
/* ------------------------------------------------------------------ */

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyDisplay: string;
  scope: ApiKeyScope;
  status: 'active' | 'revoked' | 'expired';
  permissions: ApiKeyPermission[];
  rateLimitMax: number;
  totalRequests: number;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface ApiKeyFilters {
  search?: string;
  scope?: ApiKeyScope | 'all';
  status?: 'active' | 'revoked' | 'expired' | 'all';
  page?: number;
  limit?: number;
}

export interface ApiKeyStats {
  totalKeys: number;
  activeKeys: number;
  totalRequests: string;
  avgDailyRequests: string;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface ApiKeyListResponse {
  success: boolean;
  data: Record<string, unknown>[];
  meta: PaginationMeta;
}

interface ApiKeyStatsResponse {
  success: boolean;
  data: ApiKeyStats;
}

interface ApiKeyCreateResponse {
  success: boolean;
  data: { id: string; key: string };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const apiKeyKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeyKeys.all, 'list'] as const,
  list: (filters: ApiKeyFilters) => [...apiKeyKeys.lists(), filters] as const,
  details: () => [...apiKeyKeys.all, 'detail'] as const,
  detail: (id: string) => [...apiKeyKeys.details(), id] as const,
  stats: () => [...apiKeyKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useApiKeys(filters: ApiKeyFilters) {
  return useQuery({
    queryKey: apiKeyKeys.list(filters),
    queryFn: () =>
      apiClient.get<ApiKeyListResponse>('/api/platform/api-keys', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: (res.data ?? []).map((k: Record<string, unknown>) => {
        // API returns isActive/revokedAt/expiresAt — compute status
        const revokedAt = k.revokedAt as string | null | undefined;
        const expiresAt = k.expiresAt as string | null | undefined;
        const isActive = k.isActive as boolean | undefined;

        let status: 'active' | 'revoked' | 'expired' = 'active';
        if (revokedAt || isActive === false) status = 'revoked';
        else if (expiresAt && new Date(expiresAt) < new Date()) status = 'expired';

        return {
          id: (k._id ?? k.id) as string,
          name: (k.name ?? '') as string,
          keyDisplay: (k.keyDisplay ?? '') as string,
          scope: ((k.scope as string) ?? 'live') as ApiKeyScope,
          status,
          permissions: (k.permissions ?? ['read']) as ApiKeyPermission[],
          rateLimitMax: (k.rateLimitMax ?? 1000) as number,
          totalRequests: (k.totalRequests ?? 0) as number,
          lastUsedAt: (k.lastUsedAt ?? null) as string | null,
          createdAt: (k.createdAt ?? '') as string,
          expiresAt: (k.expiresAt ?? null) as string | null,
        } satisfies ApiKeyListItem;
      }),
      meta: res.meta,
    }),
  });
}

export function useApiKeyStats() {
  return useQuery({
    queryKey: apiKeyKeys.stats(),
    queryFn: () => apiClient.get<ApiKeyStatsResponse>('/api/platform/api-keys/stats'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      scope: ApiKeyScope;
      permissions: ApiKeyPermission[];
      rateLimitMax?: number;
      expiresAt?: string;
    }) => apiClient.post<ApiKeyCreateResponse>('/api/platform/api-keys', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key generated');
    },
    onError: () => {
      toast.error('Failed to generate API key');
    },
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiKeyCreateResponse>(`/api/platform/api-keys/${id}/rotate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key rotated');
    },
    onError: () => {
      toast.error('Failed to rotate API key');
    },
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/api-keys/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: apiKeyKeys.all });
      toast.success('API key revoked');
    },
    onError: () => {
      toast.error('Failed to revoke API key');
    },
  });
}
