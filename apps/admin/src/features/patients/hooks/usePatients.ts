/**
 * Patient React Query hooks — per BUILD_RULES §8.3.
 * All CRUD queries + mutations for patient feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientQuery,
  MedicalHistoryInput,
  AllergyInput,
} from '@dento/shared';

// ── Types ───────────────────────────────────────────────────

export interface PatientListItem {
  _id: string;
  patientCode: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email?: string;
  source: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopulatedFamilyMember {
  _id: string;
  firstName: { en: string; ar?: string };
  lastName: { en: string; ar?: string };
  patientCode: string;
  phone: string;
}

export interface PatientDetail extends PatientListItem {
  nationalId?: string;
  address?: string;
  city?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: Array<{
    _id: string;
    allergen: string;
    reaction?: string;
    severity: 'mild' | 'moderate' | 'severe';
    notedAt?: string;
  }>;
  medicalHistory?: MedicalHistoryInput;
  familyLinks: Array<{
    _id: string;
    relatedPatientId: string | PopulatedFamilyMember;
    relationship: string;
    isPrimaryContact: boolean;
    isEmergencyContact: boolean;
    isFinancialResponsible: boolean;
  }>;
  insurance: Array<{
    _id: string;
    insuranceCompanyId: string;
    policyNumber: string;
    memberId: string;
    coverageType: string;
    coveragePercentage: number;
    effectiveAt: string;
    expiresAt: string;
    isPrimary: boolean;
    isActive: boolean;
  }>;
  preferredLanguage: 'en' | 'ar';
  notes?: string;
  howDidYouHear?: string;
}

interface PatientListResponse {
  success: true;
  data: {
    patients: PatientListItem[];
    pagination: PaginationMeta;
  };
}

interface PatientDetailResponse {
  success: true;
  data: {
    patient: PatientDetail;
  };
}

// ── Query Keys ──────────────────────────────────────────────

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientQuery) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// ── Queries ─────────────────────────────────────────────────

export function usePatientList(filters: PatientQuery) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () =>
      apiClient.get<PatientListResponse>('/api/patients', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      patients: res.data.patients,
      pagination: res.data.pagination,
    }),
  });
}

export function usePatientDetail(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => apiClient.get<PatientDetailResponse>(`/api/patients/${id}`),
    select: (res) => res.data.patient,
    enabled: !!id,
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientInput) =>
      apiClient.post<ApiSuccessResponse<{ patient: PatientDetail }>>('/api/patients', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePatientInput) =>
      apiClient.put<ApiSuccessResponse<{ patient: PatientDetail }>>(`/api/patients/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/patients/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useRestorePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ patient: PatientDetail }>>(
        `/api/patients/${id}/activation`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

/**
 * Phase 4.3 — merge a duplicate patient into a kept patient.
 * Re-points all owned records and soft-deletes the duplicate.
 */
export function useMergePatients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ keepId, duplicateId }: { keepId: string; duplicateId: string }) =>
      apiClient.post<
        ApiSuccessResponse<{ keepId: string; duplicateId: string; moved: Record<string, number> }>
      >(`/api/patients/${keepId}/merge/${duplicateId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.keepId) });
      qc.invalidateQueries({ queryKey: patientKeys.detail(vars.duplicateId) });
    },
  });
}

export function useUpdateMedicalHistory(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicalHistoryInput) =>
      apiClient.patch<ApiSuccessResponse<{ patient: PatientDetail }>>(
        `/api/patients/${patientId}/medical-history`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
    },
  });
}

export function useAddAllergy(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AllergyInput) =>
      apiClient.post<ApiSuccessResponse<{ patient: PatientDetail }>>(
        `/api/patients/${patientId}/allergies`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
    },
  });
}

export function useRemoveAllergy(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allergyId: string) =>
      apiClient.delete<ApiSuccessResponse<{ patient: PatientDetail }>>(
        `/api/patients/${patientId}/allergies/${allergyId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(patientId) });
    },
  });
}
