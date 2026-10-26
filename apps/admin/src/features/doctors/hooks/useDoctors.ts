import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface Doctor {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: 'male' | 'female';
  avatarUrl?: string;
  title?: string;
  specialization: string;
  licenseNumber?: string;
  bio?: string;
  branches: string[];
  primaryBranchId?: string;
  defaultSlotDuration: number;
  bufferBetweenSlots: number;
  isAcceptingNewPatients: boolean;
  isOnlineBookingEnabled: boolean;
  maxDailyPatients?: number;
  isActive: boolean;
  hiredAt?: string;
  terminatedAt?: string;
  displayOrder: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorFilters {
  page?: number;
  limit?: number;
  search?: string;
  specialization?: string;
  branchId?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface DoctorListResponse {
  success: true;
  data: {
    items: Doctor[];
    pagination: PaginationMeta;
  };
}

interface DoctorDetailResponse {
  success: true;
  data: { doctor: Doctor };
}

interface SpecializationsResponse {
  success: true;
  data: { specializations: string[] };
}

// ── Query Keys ─────────────────────────────────────────────

export const doctorKeys = {
  all: ['doctors'] as const,
  lists: () => [...doctorKeys.all, 'list'] as const,
  list: (filters: DoctorFilters) => [...doctorKeys.lists(), filters] as const,
  details: () => [...doctorKeys.all, 'detail'] as const,
  detail: (id: string) => [...doctorKeys.details(), id] as const,
  specializations: () => [...doctorKeys.all, 'specializations'] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useDoctorList(filters: DoctorFilters = {}) {
  return useQuery({
    queryKey: doctorKeys.list(filters),
    queryFn: () =>
      apiClient.get<DoctorListResponse>('/api/doctors', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.items,
      meta: res.data.pagination,
    }),
  });
}

export function useDoctorDetail(id: string) {
  return useQuery({
    queryKey: doctorKeys.detail(id),
    queryFn: () => apiClient.get<DoctorDetailResponse>(`/api/doctors/${id}`),
    select: (res) => res.data.doctor,
    enabled: !!id,
  });
}

export function useSpecializations() {
  return useQuery({
    queryKey: doctorKeys.specializations(),
    queryFn: () => apiClient.get<SpecializationsResponse>('/api/doctors/specializations'),
    select: (res) => res.data.specializations,
    staleTime: 60_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useUpdateDoctor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Doctor>) =>
      apiClient.put<DoctorDetailResponse>(`/api/doctors/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: doctorKeys.lists() });
      qc.invalidateQueries({ queryKey: doctorKeys.detail(id) });
    },
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean; data: { deleted: boolean } }>(`/api/doctors/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

export function useToggleDoctorActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<DoctorDetailResponse>(`/api/doctors/${id}/toggle`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}

export function useSyncDoctors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ success: boolean; data: { synced: number; total: number } }>(
        '/api/doctors/sync',
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: doctorKeys.lists() });
    },
  });
}
