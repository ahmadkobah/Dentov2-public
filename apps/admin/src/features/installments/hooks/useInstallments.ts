import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────

export interface InstallmentPayment {
  _id: string;
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  lateFee: number;
  paidAt?: string;
  paymentId?: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
}

export interface InstallmentPlan {
  _id: string;
  planNumber: string;
  patientId:
    | string
    | { _id: string; firstName: { en: string }; lastName: { en: string }; patientCode: string };
  invoiceId?: string | { _id: string; invoiceNumber: string };
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numberOfInstallments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  status: 'active' | 'completed' | 'defaulted' | 'cancelled';
  payments: InstallmentPayment[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentFilters {
  page?: number;
  limit?: number;
  status?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
}

// ── Response Types ──────────────────────────────────────

interface ListResponse {
  success: true;
  data: { plans: InstallmentPlan[]; meta: PaginationMeta };
}

interface DetailResponse {
  success: true;
  data: { plan: InstallmentPlan };
}

// ── Query Keys ──────────────────────────────────────────

export const installmentKeys = {
  all: ['installments'] as const,
  lists: () => [...installmentKeys.all, 'list'] as const,
  list: (f: InstallmentFilters) => [...installmentKeys.lists(), f] as const,
  details: () => [...installmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...installmentKeys.details(), id] as const,
  overdue: () => [...installmentKeys.all, 'overdue'] as const,
};

// ── Hooks ───────────────────────────────────────────────

export function useInstallmentList(filters: InstallmentFilters = {}) {
  return useQuery({
    queryKey: installmentKeys.list(filters),
    queryFn: () =>
      apiClient.get<ListResponse>('/api/installments', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.plans,
      meta: res.data.meta,
    }),
  });
}

export function useInstallmentDetail(id: string) {
  return useQuery({
    queryKey: installmentKeys.detail(id),
    queryFn: () => apiClient.get<DetailResponse>(`/api/installments/${id}`),
    select: (res) => res.data.plan,
    enabled: !!id,
  });
}

export function useCreateInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<InstallmentPlan>) =>
      apiClient.post<ApiSuccessResponse<{ plan: InstallmentPlan }>>('/api/installments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installmentKeys.lists() });
    },
  });
}

export function useRecordInstallmentPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      planId,
      paymentIndex,
      amount,
    }: {
      planId: string;
      paymentIndex: number;
      amount: number;
    }) =>
      apiClient.post<ApiSuccessResponse<{ plan: InstallmentPlan }>>(
        `/api/installments/${planId}/payments/${paymentIndex + 1}`,
        { amountPaid: amount },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installmentKeys.lists() });
      qc.invalidateQueries({ queryKey: installmentKeys.details() });
    },
  });
}

export function useCancelInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ plan: InstallmentPlan }>>(
        `/api/installments/${id}/cancel`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installmentKeys.lists() });
      qc.invalidateQueries({ queryKey: installmentKeys.details() });
    },
  });
}

export function useWaiveInstallment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, paymentIndex }: { planId: string; paymentIndex: number }) =>
      apiClient.patch<ApiSuccessResponse<{ plan: InstallmentPlan }>>(
        `/api/installments/${planId}/payments/${paymentIndex + 1}/waive`,
        {},
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: installmentKeys.lists() });
      qc.invalidateQueries({ queryKey: installmentKeys.details() });
    },
  });
}

export function useOverdueInstallments() {
  return useQuery({
    queryKey: installmentKeys.overdue(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ items: InstallmentPlan[] }>>('/api/installments/overdue'),
    select: (res) => res.data.items,
  });
}
