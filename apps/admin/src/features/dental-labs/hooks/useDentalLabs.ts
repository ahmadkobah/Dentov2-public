import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { toast } from '@dento/ui';
import type { PaginationMeta } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DentalLab {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  specialties: string[];
  rating?: number;
  defaultTurnaroundDays: number;
  pricingNotes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DentalLabFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface DentalLabListResponse {
  success: boolean;
  data: {
    dentalLabs: DentalLab[];
    pagination: PaginationMeta;
  };
}

interface DentalLabDetailResponse {
  success: boolean;
  data: { dentalLab: DentalLab };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const dentalLabKeys = {
  all: ['dental-labs'] as const,
  lists: () => [...dentalLabKeys.all, 'list'] as const,
  list: (filters: DentalLabFilters) => [...dentalLabKeys.lists(), filters] as const,
  details: () => [...dentalLabKeys.all, 'detail'] as const,
  detail: (id: string) => [...dentalLabKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useDentalLabs(filters: DentalLabFilters = {}) {
  return useQuery({
    queryKey: dentalLabKeys.list(filters),
    queryFn: () =>
      apiClient.get<DentalLabListResponse>('/api/dental-labs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({
      items: res.data.dentalLabs ?? res.data,
      pagination: res.data.pagination,
    }),
  });
}

export function useDentalLabDetail(id: string) {
  return useQuery({
    queryKey: dentalLabKeys.detail(id),
    queryFn: () => apiClient.get<DentalLabDetailResponse>(`/api/dental-labs/${id}`),
    select: (res) => res.data.dentalLab,
    enabled: !!id,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useCreateDentalLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/api/dental-labs', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dentalLabKeys.all });
      toast.success('Dental lab created');
    },
    onError: () => {
      toast.error('Failed to create dental lab');
    },
  });
}

export function useUpdateDentalLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiClient.put(`/api/dental-labs/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dentalLabKeys.all });
      toast.success('Dental lab updated');
    },
    onError: () => {
      toast.error('Failed to update dental lab');
    },
  });
}

export function useDeleteDentalLab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/dental-labs/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dentalLabKeys.all });
      toast.success('Dental lab deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate dental lab');
    },
  });
}
