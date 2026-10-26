/**
 * Appointment React Query hooks — per BUILD_RULES §8.3.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQuery,
  AppointmentStatus,
} from '@dento/shared';

// ── Types ───────────────────────────────────────────────────

export interface AppointmentItem {
  _id: string;
  patientId: string;
  doctorId: string;
  branchId: string;
  appointmentTypeId?: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: string;
  status: AppointmentStatus;
  source: string;
  isWalkIn: boolean;
  reason?: string;
  notes?: string;
  internalNotes?: string;
  consultationFee?: number;
  cancellationReason?: string;
  chairNumber?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Populated fields from list responses
  patient?: {
    _id: string;
    firstName: { en: string; ar?: string };
    lastName: { en: string; ar?: string };
    phone: string;
    email?: string;
    medicalHistory?: {
      isDiabetes?: boolean;
      isHypertension?: boolean;
      isHeartDisease?: boolean;
      isAsthma?: boolean;
      isPregnant?: boolean;
      isBleedingDisorder?: boolean;
      isTakingBloodThinners?: boolean;
      isAllergicToPenicillin?: boolean;
      isAllergicToAnesthesia?: boolean;
      isAllergicToLatex?: boolean;
    };
    allergies?: Array<{ allergen: string; severity?: string }>;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  appointmentType?: { _id: string; name: { en: string; ar?: string }; color: string };
}

interface AppointmentListResponse {
  success: true;
  data: {
    appointments: AppointmentItem[];
    pagination: PaginationMeta;
  };
}

interface AppointmentDetailResponse {
  success: true;
  data: {
    appointment: AppointmentItem;
  };
}

// ── Query Keys ──────────────────────────────────────────────

export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (filters: AppointmentQuery) => [...appointmentKeys.lists(), filters] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
};

// ── Queries ─────────────────────────────────────────────────

export function useAppointmentList(filters: AppointmentQuery) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () =>
      apiClient.get<AppointmentListResponse>('/api/appointments', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      appointments: res.data.appointments,
      pagination: res.data.pagination,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAppointmentDetail(id: string) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => apiClient.get<AppointmentDetailResponse>(`/api/appointments/${id}`),
    select: (res) => res.data.appointment,
    enabled: !!id,
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      apiClient.post<ApiSuccessResponse<{ appointment: AppointmentItem }>>(
        '/api/appointments',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentInput) =>
      apiClient.put<ApiSuccessResponse<{ appointment: AppointmentItem }>>(
        `/api/appointments/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
      qc.invalidateQueries({ queryKey: appointmentKeys.detail(id) });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      chairNumber,
    }: {
      id: string;
      status: AppointmentStatus;
      chairNumber?: number;
    }) => {
      const body: Record<string, unknown> = { status };
      if (chairNumber !== undefined) body.chairNumber = chairNumber;
      return apiClient.patch<ApiSuccessResponse<{ appointment: AppointmentItem }>>(
        `/api/appointments/${id}/status`,
        body,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
      qc.invalidateQueries({ queryKey: ['daily-ops'] });
      qc.invalidateQueries({ queryKey: ['reports', 'dashboard'] });
      toast.success('Appointment status updated');
    },
    onError: () => {
      toast.error('Failed to update appointment status');
    },
  });
}

export function useCancelAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiClient.patch<ApiSuccessResponse<{ appointment: AppointmentItem }>>(
        `/api/appointments/${id}/status`,
        { status: 'cancelled', cancellationReason: reason },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
      qc.invalidateQueries({ queryKey: ['daily-ops'] });
      toast.success('Appointment cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel appointment');
    },
  });
}

/** Reschedule — first-class action (Phase 3.2). Used by both drag-drop and the
 *  Reschedule dialog. Goes through the dedicated `/reschedule` endpoint so the
 *  server can re-validate the slot, write a medium-sensitivity audit, and fire
 *  `appointment.rescheduled` notifications. */
export function useRescheduleAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      date,
      startTime,
      endTime,
      durationMinutes,
      branchId,
      doctorId,
      reason,
    }: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      durationMinutes?: number;
      branchId?: string;
      doctorId?: string;
      reason?: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ appointment: AppointmentItem }>>(
        `/api/appointments/${id}/reschedule`,
        {
          date,
          startTime,
          endTime,
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(branchId ? { branchId } : {}),
          ...(doctorId ? { doctorId } : {}),
          reason: reason ?? '',
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: appointmentKeys.lists() });
    },
  });
}

export function useSendAppointmentNotification() {
  return useMutation({
    mutationFn: ({ id, channel }: { id: string; channel: 'sms' | 'whatsapp' }) =>
      apiClient.post<ApiSuccessResponse<{ sent: boolean }>>(`/api/appointments/${id}/notify`, {
        channel,
      }),
    onSuccess: (_data, vars) => {
      toast.success(`Confirmation sent via ${vars.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`);
    },
    onError: () => {
      toast.error('Failed to send notification');
    },
  });
}
