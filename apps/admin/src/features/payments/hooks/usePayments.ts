import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'bank_transfer'
  | 'cheque'
  | 'insurance'
  | 'online'
  | 'fawry'
  | 'meeza';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface TenantPayment {
  _id: string;
  invoiceId: string | { _id: string; invoiceNumber: string; totalAmount: number };
  patientId:
    | string
    | { _id: string; firstName: { en: string }; lastName: { en: string }; patientCode: string };
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paymentReference?: string;
  receivedAt: string;
  receivedBy?: string;
  notes?: string;
  providerPaymentId?: string;
  last4?: string;
  cardBrand?: string;
  refundedAt?: string;
  refundReason?: string;
  refundedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reconciliation {
  _id: string;
  branchId: string | { _id: string; name: { en: string } };
  reconciliationDate: string;
  status: 'open' | 'closed' | 'reviewed';
  openingBalance: number;
  closingBalance: number;
  totalCash: number;
  totalCard: number;
  totalOnline: number;
  totalInsurance: number;
  expectedTotal: number;
  actualTotal: number;
  discrepancy: number;
  notes?: string;
  createdBy: string;
  closedBy?: string;
  closedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  patientId?: string;
  invoiceId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ReconciliationFilters {
  page?: number;
  limit?: number;
  branchId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ── Response Types ─────────────────────────────────────────

interface PaymentListResponse {
  success: true;
  data: {
    payments: TenantPayment[];
    pagination: PaginationMeta;
  };
}

interface PaymentDetailResponse {
  success: true;
  data: { payment: TenantPayment };
}

interface ReconciliationListResponse {
  success: true;
  data: {
    reconciliations: Reconciliation[];
    pagination: PaginationMeta;
  };
}

// ── Query Keys ─────────────────────────────────────────────

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: PaymentFilters) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

export const reconciliationKeys = {
  all: ['reconciliations'] as const,
  lists: () => [...reconciliationKeys.all, 'list'] as const,
  list: (filters: ReconciliationFilters) => [...reconciliationKeys.lists(), filters] as const,
};

// ── Payment Queries ────────────────────────────────────────

export function usePaymentList(filters: PaymentFilters = {}) {
  return useQuery({
    queryKey: paymentKeys.list(filters),
    queryFn: () =>
      apiClient.get<PaymentListResponse>('/api/tenant-payments', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.payments,
      pagination: res.data.pagination,
    }),
  });
}

export function usePaymentDetail(id: string) {
  return useQuery({
    queryKey: paymentKeys.detail(id),
    queryFn: () => apiClient.get<PaymentDetailResponse>(`/api/tenant-payments/${id}`),
    select: (res) => res.data.payment,
    enabled: !!id,
  });
}

// ── Payment Mutations ──────────────────────────────────────

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      invoiceId: string;
      patientId: string;
      amount: number;
      paymentMethod: PaymentMethod;
      paymentReference?: string;
      notes?: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ payment: TenantPayment }>>('/api/tenant-payments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.lists() });
      // Also refresh invoices since payment updates invoice balance
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useRefundPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<ApiSuccessResponse<{ payment: TenantPayment }>>(
        `/api/tenant-payments/${id}/refund`,
        { reason },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentKeys.lists() });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

// ── Reconciliation Queries ─────────────────────────────────

export function useReconciliationList(filters: ReconciliationFilters = {}) {
  return useQuery({
    queryKey: reconciliationKeys.list(filters),
    queryFn: () =>
      apiClient.get<ReconciliationListResponse>('/api/tenant-payments/reconciliation', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.reconciliations,
      pagination: res.data.pagination,
    }),
  });
}

export function useOpenReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { branchId: string; reconciliationDate: string; openingBalance?: number }) =>
      apiClient.post<ApiSuccessResponse<{ reconciliation: Reconciliation }>>(
        '/api/tenant-payments/reconciliation',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reconciliationKeys.lists() });
    },
  });
}

export function useUpdateReconciliation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { status?: string; actualTotal?: number; notes?: string };
    }) =>
      apiClient.put<ApiSuccessResponse<{ reconciliation: Reconciliation }>>(
        `/api/tenant-payments/reconciliation/${id}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reconciliationKeys.lists() });
    },
  });
}
