/**
 * Schedule React Query hooks — per BUILD_RULES §8.3.
 *
 * Covers: Doctor Schedules, Schedule Exceptions, Shift Templates, Staff Schedules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import type {
  CreateDoctorScheduleInput,
  UpdateDoctorScheduleInput,
  DoctorScheduleQuery,
  CreateScheduleExceptionInput,
  ReviewScheduleExceptionInput,
  CreateShiftTemplateInput,
  UpdateShiftTemplateInput,
  CreateStaffScheduleInput,
  UpdateStaffScheduleInput,
  UpdateBranchHolidaysInput,
  UpdateSlotConfigInput,
  UpdateOnlineBookingConfigInput,
} from '@dento/shared';

// ── Types ───────────────────────────────────────────────

export interface DoctorSchedule {
  _id: string;
  doctorId: string;
  branchId: string;
  scheduleType: 'recurring' | 'override';
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  slotDuration: number;
  isAvailable: boolean;
  isRamadanSchedule: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleException {
  _id: string;
  doctorId: string;
  branchId?: string;
  exceptionType: string;
  startDate: string;
  endDate: string;
  isFullDay: boolean;
  specialStartTime?: string;
  specialEndTime?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  notes?: string;
  approvedBy?: string;
  rejectionReason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftTemplate {
  _id: string;
  name: { en: string; ar?: string };
  startTime: string;
  endTime: string;
  breakDuration: number;
  shiftType: string;
  color?: string;
  branchId?: string;
  applicableRoles: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffSchedule {
  _id: string;
  userId: string;
  branchId: string;
  shiftTemplateId?: string;
  scheduleDate: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  role: string;
  status: string;
  isPublished: boolean;
  isRamadanSchedule: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Query Keys ──────────────────────────────────────────

export const scheduleKeys = {
  all: ['schedules'] as const,
  doctors: () => [...scheduleKeys.all, 'doctors'] as const,
  doctorList: (filters: Record<string, unknown>) => [...scheduleKeys.doctors(), filters] as const,
  exceptions: () => [...scheduleKeys.all, 'exceptions'] as const,
  exceptionList: (filters: Record<string, unknown>) =>
    [...scheduleKeys.exceptions(), filters] as const,
  shifts: () => [...scheduleKeys.all, 'shifts'] as const,
  shiftList: (filters: Record<string, unknown>) => [...scheduleKeys.shifts(), filters] as const,
  staff: () => [...scheduleKeys.all, 'staff'] as const,
  staffList: (filters: Record<string, unknown>) => [...scheduleKeys.staff(), filters] as const,
};

// ── Doctor Schedule Queries ─────────────────────────────

export function useDoctorScheduleList(filters: Partial<DoctorScheduleQuery> = {}) {
  return useQuery({
    queryKey: scheduleKeys.doctorList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          schedules: DoctorSchedule[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/schedules/doctors', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

export function useCreateDoctorSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDoctorScheduleInput) =>
      apiClient.post<ApiSuccessResponse<{ schedule: DoctorSchedule }>>(
        '/api/schedules/doctors',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.doctors() });
    },
  });
}

export function useUpdateDoctorSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDoctorScheduleInput }) =>
      apiClient.put<ApiSuccessResponse<{ schedule: DoctorSchedule }>>(
        `/api/schedules/doctors/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.doctors() });
    },
  });
}

export function useDeleteDoctorSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ schedule: DoctorSchedule }>>(
        `/api/schedules/doctors/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.doctors() });
    },
  });
}

// ── Schedule Exception Queries ──────────────────────────

export function useScheduleExceptionList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: scheduleKeys.exceptionList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          exceptions: ScheduleException[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/schedules/exceptions', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

export function useCreateScheduleException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateScheduleExceptionInput) =>
      apiClient.post<ApiSuccessResponse<{ exception: ScheduleException }>>(
        '/api/schedules/exceptions',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.exceptions() });
    },
  });
}

export function useReviewScheduleException() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewScheduleExceptionInput }) =>
      apiClient.patch<ApiSuccessResponse<{ exception: ScheduleException }>>(
        `/api/schedules/exceptions/${id}/status`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.exceptions() });
      // Approval may auto-deactivate overlapping doctor schedules
      qc.invalidateQueries({ queryKey: scheduleKeys.doctors() });
    },
  });
}

// ── Shift Template Queries ──────────────────────────────

export function useShiftTemplateList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: scheduleKeys.shiftList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          shifts: ShiftTemplate[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/schedules/shifts', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShiftTemplateInput) =>
      apiClient.post<ApiSuccessResponse<{ shift: ShiftTemplate }>>('/api/schedules/shifts', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.shifts() });
    },
  });
}

export function useUpdateShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateShiftTemplateInput }) =>
      apiClient.put<ApiSuccessResponse<{ shift: ShiftTemplate }>>(
        `/api/schedules/shifts/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.shifts() });
    },
  });
}

export function useDeleteShiftTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ shift: ShiftTemplate }>>(`/api/schedules/shifts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.shifts() });
    },
  });
}

// ── Staff Schedule Queries ──────────────────────────────

export function useStaffScheduleList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: scheduleKeys.staffList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          schedules: StaffSchedule[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/schedules/staff', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data,
  });
}

export function useCreateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffScheduleInput) =>
      apiClient.post<ApiSuccessResponse<{ schedule: StaffSchedule }>>('/api/schedules/staff', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.staff() });
    },
  });
}

export function useUpdateStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffScheduleInput }) =>
      apiClient.put<ApiSuccessResponse<{ schedule: StaffSchedule }>>(
        `/api/schedules/staff/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.staff() });
    },
  });
}

export function useDeleteStaffSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ schedule: StaffSchedule }>>(
        `/api/schedules/staff/${id}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scheduleKeys.staff() });
    },
  });
}

// ── Branch Config Mutations ─────────────────────────────

export function useUpdateBranchHolidays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: UpdateBranchHolidaysInput }) =>
      apiClient.put(`/api/schedules/branches/${branchId}/holidays`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateSlotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: UpdateSlotConfigInput }) =>
      apiClient.put(`/api/schedules/branches/${branchId}/slot-config`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateOnlineBookingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, data }: { branchId: string; data: UpdateOnlineBookingConfigInput }) =>
      apiClient.put(`/api/schedules/branches/${branchId}/online-booking`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}
