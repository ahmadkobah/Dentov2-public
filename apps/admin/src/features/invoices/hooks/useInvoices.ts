import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface InvoiceItem {
  _id?: string;
  description: string;
  treatmentId?: string;
  serviceId?: string;
  toothNumber?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patientId:
    | string
    | {
        _id: string;
        firstName: { en: string };
        lastName: { en: string };
        patientCode: string;
        phone?: string;
        email?: string;
      };
  branchId: string | { _id: string; name: { en: string } };
  appointmentId?: string;
  treatmentPlanId?: string;
  doctorId?: string | { _id: string; name: { en: string } };
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  taxAmount: number;
  taxPercentage: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency?: string;
  status:
    | 'draft'
    | 'issued'
    | 'installment'
    | 'paid'
    | 'partially_paid'
    | 'overdue'
    | 'cancelled'
    | 'refunded';
  issueDate?: string;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
  terms?: string;
  insuranceClaimId?: string;
  insuredAmount: number;
  patientResponsibility: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  patientId?: string;
  branchId?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface InvoiceListResponse {
  success: true;
  data: {
    invoices: Invoice[];
    pagination: PaginationMeta;
  };
}

interface InvoiceDetailResponse {
  success: true;
  data: { invoice: Invoice };
}

// ── Query Keys ─────────────────────────────────────────────

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters: InvoiceFilters) => [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
  stats: () => [...invoiceKeys.all, 'stats'] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useInvoiceList(filters: InvoiceFilters = {}) {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: () =>
      apiClient.get<InvoiceListResponse>('/api/invoices', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.invoices,
      pagination: res.data.pagination,
    }),
  });
}

export function useInvoiceDetail(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => apiClient.get<InvoiceDetailResponse>(`/api/invoices/${id}`),
    select: (res) => res.data.invoice,
    enabled: !!id,
  });
}

// ── Invoice Stats ──────────────────────────────────────────

export interface InvoiceStats {
  byStatus: Record<string, { count: number; total: number }>;
  overall: {
    totalInvoices: number;
    totalRevenue: number;
    totalCollected: number;
    totalOutstanding: number;
  };
  recentMonth: { count: number; amount: number };
}

interface InvoiceStatsResponse {
  success: true;
  data: { stats: InvoiceStats };
}

export function useInvoiceStats() {
  return useQuery({
    queryKey: invoiceKeys.stats(),
    queryFn: () => apiClient.get<InvoiceStatsResponse>('/api/invoices/stats'),
    select: (res) => res.data.stats,
    staleTime: 30_000,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Invoice>) =>
      apiClient.post<ApiSuccessResponse<{ invoice: Invoice }>>('/api/invoices', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Invoice>) =>
      apiClient.put<ApiSuccessResponse<{ invoice: Invoice }>>(`/api/invoices/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiSuccessResponse<{ invoice: Invoice }>>(`/api/invoices/${id}/issue`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<{ invoice: Invoice }>>(`/api/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

export function useGenerateInvoiceFromPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      treatmentPlanId: string;
      branchId: string;
      currency?: string;
      notes?: string;
      dueDate?: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ invoice: Invoice }>>(
        '/api/invoices/generate-from-treatment-plan',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ── Send Invoice Email ─────────────────────────────────

export function useSendInvoiceEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiSuccessResponse<{ invoice: Invoice }>>(`/api/invoices/${id}/send`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
    },
  });
}

// ── Refund Invoice (Phase 7.4) ─────────────────────────

export function useRefundInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      apiClient.post<ApiSuccessResponse<{ invoice: Invoice; refundedAmount: number }>>(
        `/api/invoices/${id}/refund`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.lists() });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
    },
  });
}
