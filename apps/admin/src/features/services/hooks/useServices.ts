import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import type { CreateServiceInput } from '@dento/shared';

// ── Types ──────────────────────────────────────────────────

export interface Service {
  _id: string;
  name: { en: string; ar?: string };
  description?: { en: string; ar?: string };
  code?: string;
  chartCondition?: string;
  defaultPrice: number;
  branchPrices?: { branchId: string; price: number }[];
  defaultDuration: number;
  requiredMaterials?: { materialId: string; quantity: number }[];
  isActive: boolean;
  isDefault?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface ServiceListResponse {
  success: true;
  data: {
    services: Service[];
    pagination: PaginationMeta;
  };
}

interface ServiceDetailResponse {
  success: true;
  data: { service: Service };
}

// ── Query Keys ─────────────────────────────────────────────

export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: ServiceFilters) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

// ── Service Queries ────────────────────────────────────────

export function useServiceList(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () =>
      apiClient.get<ServiceListResponse>('/api/services', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.services,
      meta: res.data.pagination,
    }),
  });
}

export function useServiceDetail(id: string) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: () => apiClient.get<ServiceDetailResponse>(`/api/services/${id}`),
    select: (res) => res.data.service,
    enabled: !!id,
  });
}

// ── Service Mutations ──────────────────────────────────────

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServiceInput) =>
      apiClient.post<ApiSuccessResponse<{ service: Service }>>('/api/services', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}

export function useUpdateService(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServiceInput) =>
      apiClient.put<ApiSuccessResponse<{ service: Service }>>(`/api/services/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serviceKeys.lists() });
      qc.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/services/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}
