/**
 * Appointment Type React Query hooks — per BUILD_RULES §8.3.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import type { CreateAppointmentTypeInput, UpdateAppointmentTypeInput } from '@dento/shared';

// ── Types ───────────────────────────────────────────────

export interface AppointmentTypeItem {
  _id: string;
  name: { en: string; ar?: string };
  code: string;
  defaultDuration: number;
  color: string;
  icon?: string;
  isDoctorRequired: boolean;
  isOnlineBookingAllowed: boolean;
  defaultFee?: number;
  isDefault?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentTypeListResponse {
  success: true;
  data: {
    types: AppointmentTypeItem[];
  };
}

interface AppointmentTypeDetailResponse {
  success: true;
  data: {
    type: AppointmentTypeItem;
  };
}

// ── Query Keys ──────────────────────────────────────────

export const appointmentTypeKeys = {
  all: ['appointment-types'] as const,
  lists: () => [...appointmentTypeKeys.all, 'list'] as const,
  list: (filters: { activeOnly?: boolean }) => [...appointmentTypeKeys.lists(), filters] as const,
  details: () => [...appointmentTypeKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentTypeKeys.details(), id] as const,
};

// ── Queries ─────────────────────────────────────────────

export function useAppointmentTypeList(filters: { activeOnly?: boolean } = {}) {
  return useQuery({
    queryKey: appointmentTypeKeys.list(filters),
    queryFn: () =>
      apiClient.get<AppointmentTypeListResponse>('/api/appointment-types', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data.types,
  });
}

export function useAppointmentTypeDetail(id: string) {
  return useQuery({
    queryKey: appointmentTypeKeys.detail(id),
    queryFn: () => apiClient.get<AppointmentTypeDetailResponse>(`/api/appointment-types/${id}`),
    select: (res) => res.data.type,
    enabled: !!id,
  });
}

// ── Mutations ───────────────────────────────────────────

export function useCreateAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentTypeInput) =>
      apiClient.post<ApiSuccessResponse<{ type: AppointmentTypeItem }>>(
        '/api/appointment-types',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentTypeKeys.lists() });
    },
  });
}

export function useUpdateAppointmentType(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentTypeInput) =>
      apiClient.put<ApiSuccessResponse<{ type: AppointmentTypeItem }>>(
        `/api/appointment-types/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentTypeKeys.lists() });
      qc.invalidateQueries({ queryKey: appointmentTypeKeys.detail(id) });
    },
  });
}

export function useDeleteAppointmentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/appointment-types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentTypeKeys.lists() });
    },
  });
}
