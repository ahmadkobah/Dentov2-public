import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface PrescriptionItem {
  _id?: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity?: number;
  instructions?: string;
  notes?: string;
}

export interface PopulatedName {
  _id: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  phone?: string;
}

export interface Prescription {
  _id: string;
  patientId: string | PopulatedName;
  doctorId: string;
  appointmentId?: string;
  treatmentPlanId?: string;
  procedureNoteId?: string;
  prescriptionNumber: string;
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
  status: 'draft' | 'active' | 'dispensed' | 'cancelled';
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  doctorId?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface PrescriptionListResponse {
  success: true;
  data: {
    prescriptions: Prescription[];
    pagination: PaginationMeta;
  };
}

interface PrescriptionDetailResponse {
  success: true;
  data: { prescription: Prescription };
}

// ── Query Keys ─────────────────────────────────────────────

export const prescriptionKeys = {
  all: ['prescriptions'] as const,
  lists: () => [...prescriptionKeys.all, 'list'] as const,
  list: (filters: PrescriptionFilters) => [...prescriptionKeys.lists(), filters] as const,
  details: () => [...prescriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...prescriptionKeys.details(), id] as const,
};

// ── Queries ────────────────────────────────────────────────

export function usePrescriptionList(filters: PrescriptionFilters = {}) {
  return useQuery({
    queryKey: prescriptionKeys.list(filters),
    queryFn: () =>
      apiClient.get<PrescriptionListResponse>('/api/prescriptions', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.prescriptions,
      meta: res.data.pagination,
    }),
  });
}

export function usePrescriptionDetail(id: string) {
  return useQuery({
    queryKey: prescriptionKeys.detail(id),
    queryFn: () => apiClient.get<PrescriptionDetailResponse>(`/api/prescriptions/${id}`),
    select: (res) => res.data.prescription,
    enabled: !!id,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Prescription>) =>
      apiClient.post<ApiSuccessResponse<{ prescription: Prescription }>>(
        '/api/prescriptions',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
    },
  });
}

export function useUpdatePrescription(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Prescription>) =>
      apiClient.put<ApiSuccessResponse<{ prescription: Prescription }>>(
        `/api/prescriptions/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
      qc.invalidateQueries({ queryKey: prescriptionKeys.detail(id) });
    },
  });
}

export function useUpdatePrescriptionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch<ApiSuccessResponse<{ prescription: Prescription }>>(
        `/api/prescriptions/${id}/status`,
        { status },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
    },
  });
}

export function useDeletePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/prescriptions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: prescriptionKeys.lists() });
    },
  });
}
