/**
 * useCustomFields — Admin portal hooks for Custom Fields CRUD
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.6
 * Admin apiClient already injects X-Tenant-Slug from authStore,
 * so no manual header injection needed (unlike developer portal).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import type {
  CustomField,
  CustomFieldListResponse,
  CustomFieldDetailResponse,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CustomFieldEntity,
} from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const customFieldKeys = {
  all: ['admin-custom-fields'] as const,
  lists: () => [...customFieldKeys.all, 'list'] as const,
  list: (entity?: CustomFieldEntity) => [...customFieldKeys.lists(), entity] as const,
  byEntity: (entity: string) => [...customFieldKeys.all, 'entity', entity] as const,
  details: () => [...customFieldKeys.all, 'detail'] as const,
  detail: (id: string) => [...customFieldKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CustomFieldFilters {
  entity?: CustomFieldEntity;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** List custom fields with optional entity/active filter + pagination. */
export function useCustomFields(filters: CustomFieldFilters = {}) {
  return useQuery({
    queryKey: customFieldKeys.list(filters.entity),
    queryFn: () =>
      apiClient.get<CustomFieldListResponse>('/api/custom-fields', {
        params: {
          ...(filters.entity && { entity: filters.entity }),
          ...(filters.isActive !== undefined && { isActive: filters.isActive }),
          page: filters.page ?? 1,
          limit: filters.limit ?? 50,
        },
      }),
    select: (res) => ({
      items: res.data as unknown as CustomField[],
      pagination: res.meta,
    }),
  });
}

/** Get all fields for a specific entity (e.g. "patient"). */
export function useCustomFieldsByEntity(entity: string) {
  return useQuery({
    queryKey: customFieldKeys.byEntity(entity),
    queryFn: () =>
      apiClient.get<{ success: boolean; data: { fields: CustomField[] } }>(
        `/api/custom-fields/entity/${entity}`,
      ),
    select: (res) => res.data.fields,
    enabled: !!entity,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

/** Create a new custom field. */
export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCustomFieldInput) =>
      apiClient.post<CustomFieldDetailResponse>('/api/custom-fields', input),
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
export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCustomFieldInput & { id: string }) =>
      apiClient.patch<CustomFieldDetailResponse>(`/api/custom-fields/${id}`, input),
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
export function useToggleCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<CustomFieldDetailResponse>(`/api/custom-fields/${id}/toggle`, { isActive }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
      toast.success(vars.isActive ? 'Field activated' : 'Field deactivated');
    },
    onError: () => {
      toast.error('Failed to toggle field');
    },
  });
}

/** Delete a custom field permanently. */
export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/custom-fields/${id}`),
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
export function useReorderCustomFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: string; sortOrder: number }>) =>
      Promise.all(
        updates.map(({ id, sortOrder }) =>
          apiClient.patch<CustomFieldDetailResponse>(`/api/custom-fields/${id}`, { sortOrder }),
        ),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customFieldKeys.lists() });
    },
  });
}
