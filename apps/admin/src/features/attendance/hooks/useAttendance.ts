/**
 * Attendance React Query hooks — per BUILD_RULES §8.3.
 *
 * Covers: Attendance list, clock in/out, breaks, manual entry.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import type { ClockInInput, ManualAttendanceInput } from '@dento/shared';

// ── Types ───────────────────────────────────────────────

export interface AttendanceRecord {
  _id: string;
  userId: string;
  branchId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  breakStart?: string;
  breakEnd?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday';
  lateMinutes: number;
  overtime: number;
  actualHours: number;
  verifiedBy?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Query Keys ──────────────────────────────────────────

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters: Record<string, unknown>) => [...attendanceKeys.all, 'list', filters] as const,
};

// ── Queries ─────────────────────────────────────────────

export function useAttendanceList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          records: AttendanceRecord[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/attendance', { params: filters as Record<string, string> }),
    select: (res) => res.data,
  });
}

// ── Mutations ───────────────────────────────────────────

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClockInInput) =>
      apiClient.post<ApiSuccessResponse<{ record: AttendanceRecord }>>('/api/attendance', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data?: { notes?: string }) =>
      apiClient.patch<ApiSuccessResponse<{ record: AttendanceRecord }>>('/api/attendance/today', {
        action: 'clock_out',
        notes: data?.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useStartBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.patch<ApiSuccessResponse<{ record: AttendanceRecord }>>('/api/attendance/today', {
        action: 'break_start',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useEndBreak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.patch<ApiSuccessResponse<{ record: AttendanceRecord }>>('/api/attendance/today', {
        action: 'break_end',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}

export function useCreateManualAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ManualAttendanceInput) =>
      apiClient.post<ApiSuccessResponse<{ record: AttendanceRecord }>>(
        '/api/attendance/manual',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });
}
