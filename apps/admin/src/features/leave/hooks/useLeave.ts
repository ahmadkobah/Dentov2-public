/**
 * Leave React Query hooks — per BUILD_RULES §8.3.
 *
 * Covers: Leave Types, Leave Requests, Leave Balances
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import type {
  CreateLeaveTypeInput,
  UpdateLeaveTypeInput,
  CreateLeaveRequestInput,
  UpdateLeaveRequestInput,
  ReviewLeaveRequestInput,
  UpdateLeaveBalanceInput,
} from '@dento/shared';

// ── Types ───────────────────────────────────────────────

export interface LeaveType {
  _id: string;
  name: { en: string; ar?: string };
  code: string;
  maxDaysPerYear: number;
  isPaid: boolean;
  isApprovalRequired: boolean;
  maxDaysPerRequest?: number;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  _id: string;
  userId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  attachments: { name: string; url: string }[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  _id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  totalAllowance: number;
  usedDays: number;
  remainingDays: number;
  carriedForward: number;
  createdAt: string;
  updatedAt: string;
}

// ── Query Keys ──────────────────────────────────────────

export const leaveKeys = {
  all: ['leave'] as const,
  types: () => [...leaveKeys.all, 'types'] as const,
  typeList: (filters: Record<string, unknown>) => [...leaveKeys.types(), filters] as const,
  requests: () => [...leaveKeys.all, 'requests'] as const,
  requestList: (filters: Record<string, unknown>) => [...leaveKeys.requests(), filters] as const,
  requestDetail: (id: string) => [...leaveKeys.requests(), 'detail', id] as const,
  balances: () => [...leaveKeys.all, 'balances'] as const,
  balanceList: (filters: Record<string, unknown>) => [...leaveKeys.balances(), filters] as const,
};

// ── Leave Type Queries ──────────────────────────────────

export function useLeaveTypeList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: leaveKeys.typeList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          types: LeaveType[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/leave/types', { params: filters as Record<string, string> }),
    select: (res) => res.data,
  });
}

export function useCreateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveTypeInput) =>
      apiClient.post<ApiSuccessResponse<{ type: LeaveType }>>('/api/leave/types', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

export function useUpdateLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveTypeInput }) =>
      apiClient.put<ApiSuccessResponse<{ type: LeaveType }>>(`/api/leave/types/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

export function useDeleteLeaveType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ type: LeaveType }>>(`/api/leave/types/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.types() });
    },
  });
}

// ── Leave Request Queries ───────────────────────────────

export function useLeaveRequestList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: leaveKeys.requestList(filters),
    queryFn: () =>
      apiClient.get<
        ApiSuccessResponse<{
          requests: LeaveRequest[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>
      >('/api/leave/requests', { params: filters as Record<string, string> }),
    select: (res) => res.data,
  });
}

export function useLeaveRequestDetail(id: string) {
  return useQuery({
    queryKey: leaveKeys.requestDetail(id),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ request: LeaveRequest }>>(`/api/leave/requests/${id}`),
    select: (res) => res.data.request,
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeaveRequestInput) =>
      apiClient.post<ApiSuccessResponse<{ request: LeaveRequest }>>('/api/leave/requests', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requests() });
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
    },
  });
}

export function useUpdateLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveRequestInput }) =>
      apiClient.put<ApiSuccessResponse<{ request: LeaveRequest }>>(
        `/api/leave/requests/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requests() });
    },
  });
}

export function useReviewLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewLeaveRequestInput }) =>
      apiClient.patch<ApiSuccessResponse<{ request: LeaveRequest }>>(
        `/api/leave/requests/${id}/status`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requests() });
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
    },
  });
}

export function useCancelLeaveRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ request: LeaveRequest }>>(
        `/api/leave/requests/${id}/status`,
        { status: 'cancelled' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.requests() });
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
    },
  });
}

// ── Leave Balance Queries ───────────────────────────────

export function useLeaveBalanceList(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: leaveKeys.balanceList(filters),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ balances: LeaveBalance[] }>>('/api/leave/balances', {
        params: filters as Record<string, string>,
      }),
    select: (res) => res.data.balances,
  });
}

export function useUpdateLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeaveBalanceInput }) =>
      apiClient.put<ApiSuccessResponse<{ balance: LeaveBalance }>>(
        `/api/leave/balances/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leaveKeys.balances() });
    },
  });
}
