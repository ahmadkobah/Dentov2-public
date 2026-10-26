/**
 * useFeatureFlags — TanStack Query hooks for Feature Flags CRUD
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 3.8
 * Calls platform-level `/api/platform/feature-flags` endpoints.
 * Manages paginated list, create, update, toggle, and delete.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export interface FeatureFlagFilters {
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
  enabled?: boolean;
}

export const featureFlagKeys = {
  all: ['feature-flags'] as const,
  lists: () => [...featureFlagKeys.all, 'list'] as const,
  list: (filters: FeatureFlagFilters) => [...featureFlagKeys.lists(), filters] as const,
  details: () => [...featureFlagKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureFlagKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Response Wrappers                                                  */
/* ------------------------------------------------------------------ */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** List feature flags with pagination, search, and filters. */
export function useFeatureFlags(filters: FeatureFlagFilters = {}) {
  return useQuery({
    queryKey: featureFlagKeys.list(filters),
    queryFn: () =>
      apiClient.get<ApiEnvelope<FeatureFlag[]>>('/api/platform/feature-flags', {
        params: {
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
          ...(filters.search && { search: filters.search }),
          ...(filters.tenantId && { tenantId: filters.tenantId }),
          ...(filters.enabled !== undefined && { enabled: String(filters.enabled) }),
        },
      }),
    select: (res) => ({
      items: res.data,
      meta: res.meta!,
    }),
  });
}

/** Get a single feature flag by ID. */
export function useFeatureFlag(id: string | null) {
  return useQuery({
    queryKey: featureFlagKeys.detail(id!),
    queryFn: () => apiClient.get<ApiEnvelope<FeatureFlag>>(`/api/platform/feature-flags/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Create a new feature flag. */
export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeatureFlagInput) =>
      apiClient.post<ApiEnvelope<FeatureFlag>>('/api/platform/feature-flags', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      toast.success('Feature flag created');
    },
    onError: () => {
      toast.error('Failed to create feature flag');
    },
  });
}

/** Update an existing feature flag. */
export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateFeatureFlagInput & { id: string }) =>
      apiClient.patch<ApiEnvelope<FeatureFlag>>(`/api/platform/feature-flags/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      qc.invalidateQueries({ queryKey: featureFlagKeys.details() });
      toast.success('Feature flag updated');
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    },
  });
}

/** Toggle a feature flag's enabled state. */
export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiClient.patch<ApiEnvelope<FeatureFlag>>(`/api/platform/feature-flags/${id}/toggle`, {
        enabled,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      qc.invalidateQueries({ queryKey: featureFlagKeys.details() });
      toast.success(`Flag ${variables.enabled ? 'enabled' : 'disabled'}`);
    },
    onError: () => {
      toast.error('Failed to toggle feature flag');
    },
  });
}

/** Delete a feature flag permanently. */
export function useDeleteFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/feature-flags/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: featureFlagKeys.lists() });
      toast.success('Feature flag deleted');
    },
    onError: () => {
      toast.error('Failed to delete feature flag');
    },
  });
}
