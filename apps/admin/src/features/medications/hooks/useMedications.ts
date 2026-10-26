import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface Medication {
  _id: string;
  nameEn: string;
  nameAr?: string;
  genericName?: string;
  category: string;
  dosageForm: string;
  strength: string;
  defaultDosage?: string;
  defaultFrequency?: string;
  defaultDuration?: string;
  instructionsEn?: string;
  instructionsAr?: string;
  warnings?: string[];
  contraindications?: string[];
  isActive: boolean;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  dosageForm?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface MedicationAutocompleteItem {
  _id: string;
  nameEn: string;
  nameAr?: string;
  genericName?: string;
  dosageForm: string;
  strength: string;
  defaultDosage?: string;
  defaultFrequency?: string;
  defaultDuration?: string;
}

// ── Response Types ─────────────────────────────────────────

interface MedicationListResponse {
  success: true;
  data: {
    medications: Medication[];
    pagination: PaginationMeta;
  };
}

interface MedicationDetailResponse {
  success: true;
  data: { medication: Medication };
}

interface AutocompleteResponse {
  success: true;
  data: MedicationAutocompleteItem[];
}

// ── Query Keys ─────────────────────────────────────────────

export const medicationKeys = {
  all: ['medications'] as const,
  lists: () => [...medicationKeys.all, 'list'] as const,
  list: (filters: MedicationFilters) => [...medicationKeys.lists(), filters] as const,
  details: () => [...medicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...medicationKeys.details(), id] as const,
  autocomplete: (q: string) => [...medicationKeys.all, 'autocomplete', q] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useMedicationList(filters: MedicationFilters = {}) {
  return useQuery({
    queryKey: medicationKeys.list(filters),
    queryFn: () =>
      apiClient.get<MedicationListResponse>('/api/medications', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.medications,
      meta: res.data.pagination,
    }),
  });
}

export function useMedicationDetail(id: string) {
  return useQuery({
    queryKey: medicationKeys.detail(id),
    queryFn: () => apiClient.get<MedicationDetailResponse>(`/api/medications/${id}`),
    select: (res) => res.data.medication,
    enabled: !!id,
  });
}

export function useMedicationAutocomplete(q: string) {
  return useQuery({
    queryKey: medicationKeys.autocomplete(q),
    queryFn: () =>
      apiClient.get<AutocompleteResponse>('/api/medications/autocomplete', {
        params: { q, limit: '10' },
      }),
    select: (res) => res.data,
    enabled: q.length >= 1,
    staleTime: 30_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Medication>) =>
      apiClient.post<ApiSuccessResponse<{ medication: Medication }>>('/api/medications', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationKeys.lists() });
    },
  });
}

export function useUpdateMedication(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Medication>) =>
      apiClient.put<ApiSuccessResponse<{ medication: Medication }>>(`/api/medications/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationKeys.lists() });
      qc.invalidateQueries({ queryKey: medicationKeys.detail(id) });
    },
  });
}

export function useDeleteMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/medications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationKeys.lists() });
    },
  });
}

export function useRestoreMedication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ medication: Medication }>>(
        `/api/medications/${id}/activation`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: medicationKeys.lists() });
    },
  });
}
