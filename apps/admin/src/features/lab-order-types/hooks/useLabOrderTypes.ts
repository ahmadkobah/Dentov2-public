import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { toast } from '@dento/ui';
import type { PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LabOrderType {
  _id: string;
  name: { en: string; ar: string };
  category: string;
  description?: string;
  defaultTurnaroundDays: number;
  isCustom: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LabOrderTypeFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface LabOrderTypeListResponse {
  success: boolean;
  data: {
    labOrderTypes: LabOrderType[];
    pagination: PaginationMeta;
  };
}

interface LabOrderTypeDetailResponse {
  success: boolean;
  data: { labOrderType: LabOrderType };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const labOrderTypeKeys = {
  all: ['lab-order-types'] as const,
  lists: () => [...labOrderTypeKeys.all, 'list'] as const,
  list: (filters: LabOrderTypeFilters) => [...labOrderTypeKeys.lists(), filters] as const,
  details: () => [...labOrderTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...labOrderTypeKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useLabOrderTypes(filters: LabOrderTypeFilters = {}) {
  return useQuery({
    queryKey: labOrderTypeKeys.list(filters),
    queryFn: () =>
      apiClient.get<LabOrderTypeListResponse>('/api/lab-order-types', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: res.data.labOrderTypes ?? [],
      pagination: res.data.pagination,
    }),
  });
}

export function useLabOrderTypeDetail(id: string) {
  return useQuery({
    queryKey: labOrderTypeKeys.detail(id),
    queryFn: () => apiClient.get<LabOrderTypeDetailResponse>(`/api/lab-order-types/${id}`),
    select: (res) => res.data.labOrderType,
    enabled: !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateLabOrderType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/api/lab-order-types', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderTypeKeys.all });
      toast.success('Lab order type created');
    },
    onError: () => {
      toast.error('Failed to create lab order type');
    },
  });
}

export function useUpdateLabOrderType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.put(`/api/lab-order-types/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderTypeKeys.all });
      toast.success('Lab order type updated');
    },
    onError: () => {
      toast.error('Failed to update lab order type');
    },
  });
}

export function useDeleteLabOrderType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/lab-order-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderTypeKeys.all });
      toast.success('Lab order type deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate lab order type');
    },
  });
}
