/**
 * useCustomFields — TanStack Query hooks for Custom Fields CRUD
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.2
 * Calls tenant-level `/api/custom-fields` endpoints with X-Tenant-Slug header.
 * Platform admin selects a tenant, then manages its custom field definitions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type {
  CustomField,
  CustomFieldFilters,
  CustomFieldListResponse,
  CustomFieldDetailResponse,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Tenant header helper                                               */
/* ------------------------------------------------------------------ */

function tenantHeaders(tenantSlug: string): Record<string, string> {
  return { 'X-Tenant-Slug': tenantSlug };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const customFieldKeys = {
  all: ['custom-fields'] as const,
  lists: () => [...customFieldKeys.all, 'list'] as const,
  list: (tenantSlug: string, filters: CustomFieldFilters) =>
    [...customFieldKeys.lists(), tenantSlug, filters] as const,
  byEntity: (tenantSlug: string, entity: string) =>
    [...customFieldKeys.all, 'entity', tenantSlug, entity] as const,
  details: () => [...customFieldKeys.all, 'detail'] as const,
  detail: (tenantSlug: string, id: string) =>
    [...customFieldKeys.details(), tenantSlug, id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** List custom fields with optional entity/active filter + pagination. */
export function useCustomFields(tenantSlug: string, filters: CustomFieldFilters) {
  return useQuery({
    queryKey: customFieldKeys.list(tenantSlug, filters),
    queryFn: () =>
      apiClient.get<CustomFieldListResponse>('/api/custom-fields', {
        params: {
          ...(filters.entity && { entity: filters.entity }),
          ...(filters.isActive !== undefined && { isActive: filters.isActive }),
          page: filters.page ?? 1,
          limit: filters.limit ?? 50,
        },
        headers: tenantHeaders(tenantSlug),
      }),
    select: (res) => ({
      items: res.data,
      pagination: res.meta,
    }),
    enabled: !!tenantSlug,
  });
}

/** Get all fields for a specific entity (e.g. "patient"). */
export function useCustomFieldsByEntity(tenantSlug: string, entity: string) {
  return useQuery({
    queryKey: customFieldKeys.byEntity(tenantSlug, entity),
    queryFn: () =>
      apiClient.get<{ success: boolean; data: { fields: CustomField[] } }>(
        `/api/custom-fields/entity/${entity}`,
        { headers: tenantHeaders(tenantSlug) },
      ),
    select: (res) => res.data.fields,
    enabled: !!tenantSlug && !!entity,
  });
}

/** Get a single custom field by ID. */
export function useCustomFieldDetail(tenantSlug: string, id: string | null) {
  return useQuery({
    queryKey: customFieldKeys.detail(tenantSlug, id!),
    queryFn: () =>
      apiClient.get<CustomFieldDetailResponse>(`/api/custom-fields/${id}`, {
        headers: tenantHeaders(tenantSlug),
      }),
    select: (res) => res.data.customField,
    enabled: !!tenantSlug && !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Create a new custom field. */
export function useCreateCustomField(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<CustomFieldDetailResponse>('/api/custom-fields', input, {
        headers: tenantHeaders(tenantSlug),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success('Custom field created');
    },
    onError: () => {
      toast.error('Failed to create custom field');
    },
  });
}

/** Update an existing custom field. */
export function useUpdateCustomField(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCustomFieldInput & { id: string }) =>
      apiClient.patch<CustomFieldDetailResponse>(`/api/custom-fields/${id}`, input, {
        headers: tenantHeaders(tenantSlug),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success('Custom field updated');
    },
    onError: () => {
      toast.error('Failed to update custom field');
    },
  });
}

/** Toggle a custom field's active status. */
export function useToggleCustomField(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<CustomFieldDetailResponse>(
        `/api/custom-fields/${id}/toggle`,
        { isActive },
        { headers: tenantHeaders(tenantSlug) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success('Custom field toggled');
    },
    onError: () => {
      toast.error('Failed to toggle custom field');
    },
  });
}

/** Delete a custom field permanently. */
export function useDeleteCustomField(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/api/custom-fields/${id}`, {
        headers: tenantHeaders(tenantSlug),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success('Custom field deleted');
    },
    onError: () => {
      toast.error('Failed to delete custom field');
    },
  });
}

/** Batch-update sort order for multiple fields. */
export function useReorderCustomFields(tenantSlug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; sortOrder: number }>) =>
      Promise.all(
        updates.map(({ id, sortOrder }) =>
          apiClient.patch<CustomFieldDetailResponse>(
            `/api/custom-fields/${id}`,
            { sortOrder },
            { headers: tenantHeaders(tenantSlug) },
          ),
        ),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success('Fields reordered');
    },
    onError: () => {
      toast.error('Failed to reorder fields');
    },
  });
}
