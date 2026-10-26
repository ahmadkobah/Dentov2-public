import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────

export interface DoctorCommission {
  _id: string;
  doctorId: string | { _id: string; firstName: { en: string }; lastName: { en: string } };
  invoiceId: string | { _id: string; invoiceNumber: string };
  patientId?:
    | string
    | { _id: string; firstName: { en: string }; lastName: { en: string }; patientCode: string };
  serviceId?: string;
  commissionRate: number;
  invoiceAmount: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  payoutId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionPayout {
  _id: string;
  payoutNumber: string;
  doctorId: string | { _id: string; firstName: { en: string }; lastName: { en: string } };
  commissionIds: string[];
  totalAmount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque';
  reference?: string;
  status: 'draft' | 'processed' | 'cancelled';
  processedAt?: string;
  processedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionFilters {
  page?: number;
  limit?: number;
  status?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayoutFilters {
  page?: number;
  limit?: number;
  status?: string;
  doctorId?: string;
}

export interface CommissionSummary {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  byDoctor: {
    doctorId: string;
    doctorName: string;
    pending: number;
    approved: number;
    paid: number;
  }[];
}

// ── Response Types ──────────────────────────────────────

interface CommissionListResponse {
  success: true;
  data: { items: DoctorCommission[]; meta: PaginationMeta };
}

interface PayoutListResponse {
  success: true;
  data: { items: CommissionPayout[]; meta: PaginationMeta };
}

// ── Query Keys ──────────────────────────────────────────

export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (f: CommissionFilters) => [...commissionKeys.lists(), f] as const,
  details: () => [...commissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...commissionKeys.details(), id] as const,
  summary: () => [...commissionKeys.all, 'summary'] as const,
};

export const payoutKeys = {
  all: ['payouts'] as const,
  lists: () => [...payoutKeys.all, 'list'] as const,
  list: (f: PayoutFilters) => [...payoutKeys.lists(), f] as const,
  details: () => [...payoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...payoutKeys.details(), id] as const,
};

// ── Commission Hooks ────────────────────────────────────

export function useCommissionList(filters: CommissionFilters = {}) {
  return useQuery({
    queryKey: commissionKeys.list(filters),
    queryFn: () =>
      apiClient.get<CommissionListResponse>('/api/commissions', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.items,
      meta: res.data.meta,
    }),
  });
}

export function useCommissionSummary() {
  return useQuery({
    queryKey: commissionKeys.summary(),
    queryFn: () => apiClient.get<ApiSuccessResponse<CommissionSummary>>('/api/commissions/summary'),
    select: (res) => res.data,
  });
}

export function useCommissionDetail(id: string) {
  return useQuery({
    queryKey: commissionKeys.detail(id),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ commission: DoctorCommission }>>(`/api/commissions/${id}`),
    select: (res) => res.data.commission,
    enabled: !!id,
  });
}

export function useApproveCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ commission: DoctorCommission }>>(
        `/api/commissions/${id}/approve`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commissionKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.summary() });
    },
  });
}

export function useBulkApproveCommissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post<ApiSuccessResponse<unknown>>('/api/commissions/bulk-approve', { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commissionKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.summary() });
    },
  });
}

// ── Payout Hooks ────────────────────────────────────────

export function usePayoutList(filters: PayoutFilters = {}) {
  return useQuery({
    queryKey: payoutKeys.list(filters),
    queryFn: () =>
      apiClient.get<PayoutListResponse>('/api/commissions/payouts', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.items,
      meta: res.data.meta,
    }),
  });
}

export function useCreatePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      doctorId: string;
      commissionIds: string[];
      paymentMethod: string;
      reference?: string;
      notes?: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ payout: CommissionPayout }>>(
        '/api/commissions/payouts',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payoutKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.summary() });
    },
  });
}

export function useProcessPayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ payout: CommissionPayout }>>(
        `/api/commissions/payouts/${id}/process`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: payoutKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.lists() });
      qc.invalidateQueries({ queryKey: commissionKeys.summary() });
    },
  });
}
