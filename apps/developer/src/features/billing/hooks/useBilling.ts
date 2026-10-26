import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import type {
  BillingStats,
  BillingFilters,
  SaaSInvoice,
  SaaSInvoiceItem,
  PaginationMeta,
  SaaSInvoiceStatus,
} from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const billingKeys = {
  all: ['billing'] as const,
  stats: () => [...billingKeys.all, 'stats'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
  invoiceList: (filters: BillingFilters) => [...billingKeys.invoices(), filters] as const,
  invoiceDetail: (id: string) => [...billingKeys.invoices(), 'detail', id] as const,
  saasInvoices: () => [...billingKeys.all, 'saas-invoices'] as const,
  saasInvoiceList: (filters: SaaSInvoiceFilters) =>
    [...billingKeys.saasInvoices(), filters] as const,
  saasInvoiceDetail: (id: string) => [...billingKeys.saasInvoices(), 'detail', id] as const,
};

/* ------------------------------------------------------------------ */
/*  Response Types                                                     */
/* ------------------------------------------------------------------ */

export interface SaaSInvoiceFilters {
  tenantId?: string;
  status?: SaaSInvoiceStatus;
  source?: 'manual' | 'auto';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface BillingStatsResponse {
  success: boolean;
  data: BillingStats;
}

interface InvoiceListResponse {
  success: boolean;
  data: SaaSInvoice[];
  meta: PaginationMeta;
}

interface InvoiceDetailResponse {
  success: boolean;
  data: SaaSInvoice;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useBillingStats() {
  return useQuery({
    queryKey: billingKeys.stats(),
    queryFn: () => apiClient.get<BillingStatsResponse>('/api/platform/billing/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

export function useInvoices(filters: BillingFilters) {
  return useQuery({
    queryKey: billingKeys.invoiceList(filters),
    queryFn: () =>
      apiClient.get<InvoiceListResponse>('/api/platform/billing/invoices', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: billingKeys.invoiceDetail(id!),
    queryFn: () => apiClient.get<InvoiceDetailResponse>(`/api/platform/billing/invoices/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useSendReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiClient.post(`/api/platform/billing/invoices/${invoiceId}/remind`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.invoices() });
      toast.success('Payment reminder sent');
    },
    onError: () => {
      toast.error('Failed to send reminder');
    },
  });
}

/* ------------------------------------------------------------------ */
/*  SaaS Invoice CRUD Hooks                                            */
/* ------------------------------------------------------------------ */

export interface CreateInvoiceInput {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  items: Omit<SaaSInvoiceItem, 'total'>[];
  currency: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
}

export interface UpdateInvoiceInput {
  items?: Omit<SaaSInvoiceItem, 'total'>[];
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  taxRate?: number;
  notes?: string;
  currency?: string;
}

export function useSaaSInvoices(filters: SaaSInvoiceFilters) {
  return useQuery({
    queryKey: billingKeys.saasInvoiceList(filters),
    queryFn: () =>
      apiClient.get<InvoiceListResponse>('/api/platform/invoices', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useSaaSInvoiceDetail(id: string | null) {
  return useQuery({
    queryKey: billingKeys.saasInvoiceDetail(id!),
    queryFn: () => apiClient.get<InvoiceDetailResponse>(`/api/platform/invoices/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      apiClient.post<InvoiceDetailResponse>('/api/platform/invoices', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.saasInvoices() });
      toast.success('Draft invoice created');
    },
    onError: () => {
      toast.error('Failed to create invoice');
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateInvoiceInput & { id: string }) =>
      apiClient.patch<InvoiceDetailResponse>(`/api/platform/invoices/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.saasInvoices() });
      toast.success('Invoice updated');
    },
    onError: () => {
      toast.error('Failed to update invoice');
    },
  });
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<InvoiceDetailResponse>(`/api/platform/invoices/${id}/issue`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.saasInvoices() });
      toast.success('Invoice issued');
    },
    onError: () => {
      toast.error('Failed to issue invoice');
    },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<InvoiceDetailResponse>(`/api/platform/invoices/${id}/cancel`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.saasInvoices() });
      toast.success('Invoice cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel invoice');
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: billingKeys.saasInvoices() });
      toast.success('Draft invoice deleted');
    },
    onError: () => {
      toast.error('Failed to delete invoice');
    },
  });
}
