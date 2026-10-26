/**
 * Daily Operations React Query hooks — per BUILD_RULES §8.3.
 *
 * Covers walk-in queue (register, list, stats, status transitions),
 * today's appointments, doctors list, and branch chairs.
 *
 * API mapping:
 *   Walk-in Queue  → /api/walk-in-queue/*   (9 endpoints)
 *   Appointments   → /api/appointments       (filtered to today)
 *   Doctors        → /api/doctors             (active, for assignment)
 *   Branches       → /api/branches/:id        (chairs are embedded)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ───────────────────────────────────────────────────

export type WalkInStatus =
  | 'waiting'
  | 'called'
  | 'in_progress'
  | 'completed'
  | 'no_show'
  | 'cancelled';
export type WalkInPriority = 'normal' | 'urgent' | 'emergency';

export interface WalkInEntry {
  _id: string;
  branchId: string;
  patientId?: string;
  patientName: string;
  phone?: string;
  reason?: string;
  priority: WalkInPriority;
  queueNumber: number;
  status: WalkInStatus;
  calledAt?: string;
  startedAt?: string;
  completedAt?: string;
  doctorId?: string;
  doctorName?: string;
  chairId?: string;
  chairName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueueStats {
  waiting: number;
  called: number;
  inProgress: number;
  completed: number;
  noShow: number;
  cancelled: number;
  avgWaitMinutes: number;
}

export interface RegisterWalkInInput {
  branchId: string;
  patientId?: string;
  patientName: string;
  phone?: string;
  reason?: string;
  priority?: WalkInPriority;
}

export interface QueueFilters {
  branchId: string;
  status?: WalkInStatus;
  date?: string;
  page?: number;
  limit?: number;
}

// ── Query Key Factory ───────────────────────────────────────

export const dailyOpsKeys = {
  all: ['daily-ops'] as const,
  queue: () => [...dailyOpsKeys.all, 'queue'] as const,
  queueList: (filters: QueueFilters) => [...dailyOpsKeys.queue(), 'list', filters] as const,
  queueStats: (branchId: string) => [...dailyOpsKeys.queue(), 'stats', branchId] as const,
  queueDetail: (id: string) => [...dailyOpsKeys.queue(), 'detail', id] as const,
  todayAppointments: (branchId: string) => [...dailyOpsKeys.all, 'appointments', branchId] as const,
};

// ── Walk-in Queue List ──────────────────────────────────────

export function useQueueList(filters: QueueFilters) {
  return useQuery({
    queryKey: dailyOpsKeys.queueList(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('branchId', filters.branchId);
      if (filters.status) params.set('status', filters.status);
      if (filters.date) params.set('date', filters.date);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));

      const res = await apiClient.get<
        ApiSuccessResponse<{
          entries: WalkInEntry[];
          pagination: PaginationMeta;
        }>
      >(`/api/walk-in-queue?${params.toString()}`);
      return res.data;
    },
    enabled: !!filters.branchId,
    refetchInterval: 15_000, // Live refresh every 15s
  });
}

// ── Walk-in Queue Stats ─────────────────────────────────────

export function useQueueStats(branchId: string) {
  return useQuery({
    queryKey: dailyOpsKeys.queueStats(branchId),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessResponse<{ stats: QueueStats }>>(
        `/api/walk-in-queue/stats?branchId=${encodeURIComponent(branchId)}`,
      );
      return res.data.stats;
    },
    enabled: !!branchId,
    refetchInterval: 15_000,
  });
}

// ── Walk-in Queue Detail ────────────────────────────────────

export function useQueueDetail(id: string) {
  return useQuery({
    queryKey: dailyOpsKeys.queueDetail(id),
    queryFn: async () => {
      const res = await apiClient.get<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}`,
      );
      return res.data.entry;
    },
    enabled: !!id,
  });
}

// ── Register Walk-in ────────────────────────────────────────

export function useRegisterWalkIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterWalkInInput) => {
      const res = await apiClient.post<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        '/api/walk-in-queue',
        input,
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Walk-in registered');
    },
    onError: () => {
      toast.error('Failed to register walk-in');
    },
  });
}

// ── Call Patient ────────────────────────────────────────────

export function useCallPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, doctorId }: { id: string; doctorId: string }) => {
      const res = await apiClient.patch<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}/call`,
        { doctorId },
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Patient called');
    },
    onError: () => {
      toast.error('Failed to call patient');
    },
  });
}

// ── Start Treatment ─────────────────────────────────────────

export function useStartTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      chairId,
      doctorId,
    }: {
      id: string;
      chairId?: string;
      doctorId?: string;
    }) => {
      const body: Record<string, string> = {};
      if (chairId) body.chairId = chairId;
      if (doctorId) body.doctorId = doctorId;
      const res = await apiClient.patch<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}/start`,
        body,
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Treatment started');
    },
    onError: () => {
      toast.error('Failed to start treatment');
    },
  });
}

// ── Complete Treatment ──────────────────────────────────────

export function useCompleteTreatment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}/complete`,
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Treatment completed');
    },
    onError: () => {
      toast.error('Failed to complete treatment');
    },
  });
}

// ── Mark No-Show ────────────────────────────────────────────

export function useMarkNoShow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}/no-show`,
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Marked as no-show');
    },
    onError: () => {
      toast.error('Failed to mark as no-show');
    },
  });
}

// ── Cancel Queue Entry ──────────────────────────────────────

export function useCancelQueueEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch<ApiSuccessResponse<{ entry: WalkInEntry }>>(
        `/api/walk-in-queue/${id}/cancel`,
      );
      return res.data.entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dailyOpsKeys.queue() });
      toast.success('Queue entry cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel queue entry');
    },
  });
}

// ── Today's Appointments ────────────────────────────────────

export interface TodayAppointment {
  _id: string;
  patientId: string;
  doctorId: string;
  branchId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: string;
  status: string;
  source: string;
  isWalkIn: boolean;
  reason?: string;
  chairNumber?: number;
  patient?: {
    _id: string;
    firstName: { en: string; ar?: string };
    lastName: { en: string; ar?: string };
    phone: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  startedAt?: string;
}

export function useTodayAppointments(branchId: string) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return useQuery({
    queryKey: dailyOpsKeys.todayAppointments(branchId),
    queryFn: async () => {
      const params = new URLSearchParams({
        branchId,
        dateFrom: today,
        dateTo: today,
        limit: '100',
      });
      const res = await apiClient.get<
        ApiSuccessResponse<{
          appointments: TodayAppointment[];
          pagination: PaginationMeta;
        }>
      >(`/api/appointments?${params.toString()}`);
      return res.data.appointments;
    },
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
}
