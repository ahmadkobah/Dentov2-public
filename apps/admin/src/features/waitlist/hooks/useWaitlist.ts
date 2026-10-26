/**
 * Waitlist hooks — Phase 6.5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

export type WaitlistStatus = 'active' | 'notified' | 'booked' | 'cancelled' | 'expired';
export type WaitlistPriority = 'normal' | 'high' | 'urgent';

export interface WaitlistEntry {
  _id: string;
  branchId: string;
  patientId:
    | string
    | {
        _id: string;
        firstName: { en: string; ar?: string };
        lastName: { en: string; ar?: string };
        patientCode?: string;
        phone?: string;
      };
  doctorId?:
    | string
    | {
        _id: string;
        firstName: { en: string; ar?: string };
        lastName: { en: string; ar?: string };
      };
  preferredFrom: string;
  preferredTo: string;
  preferredDaysOfWeek: number[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  durationMinutes: number;
  reason?: string;
  notes?: string;
  priority: WaitlistPriority;
  status: WaitlistStatus;
  notifiedAt?: string;
  notificationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistQuery {
  branchId?: string;
  doctorId?: string;
  patientId?: string;
  status?: WaitlistStatus;
  priority?: WaitlistPriority;
  page?: number;
  limit?: number;
}

export interface CreateWaitlistInput {
  branchId: string;
  patientId: string;
  doctorId?: string;
  preferredFrom: string;
  preferredTo: string;
  preferredDaysOfWeek?: number[];
  preferredTimeStart?: string;
  preferredTimeEnd?: string;
  durationMinutes: number;
  reason?: string;
  notes?: string;
  priority?: WaitlistPriority;
}

export const waitlistKeys = {
  all: ['waitlist'] as const,
  list: (q: WaitlistQuery) => [...waitlistKeys.all, 'list', q] as const,
  detail: (id: string) => [...waitlistKeys.all, 'detail', id] as const,
};

export function useWaitlistList(query: WaitlistQuery) {
  return useQuery({
    queryKey: waitlistKeys.list(query),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const res = await apiClient.get<
        ApiSuccessResponse<{ items: WaitlistEntry[]; pagination: PaginationMeta }>
      >(`/api/waitlist?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreateWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateWaitlistInput) =>
      apiClient.post<ApiSuccessResponse<{ entry: WaitlistEntry }>>('/api/waitlist', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

export function useCancelWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ entry: WaitlistEntry }>>(`/api/waitlist/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}

export function usePromoteWaitlistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      slot,
    }: {
      id: string;
      slot: {
        date: string;
        startTime: string;
        endTime: string;
        doctorId: string;
        branchId: string;
      };
    }) =>
      apiClient.post<ApiSuccessResponse<{ notified: WaitlistEntry | null }>>(
        `/api/waitlist/${id}/promote`,
        slot,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: waitlistKeys.all });
    },
  });
}
