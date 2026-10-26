import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface LabOrder {
  _id: string;
  patientId: string;
  doctorId: string;
  branchId: string;
  dentalLabId: string;
  labOrderTypeId: string;
  treatmentPlanId?: string;
  appointmentId?: string;
  orderNumber: string;
  toothNumbers: number[];
  shade: string;
  material: string;
  description: string;
  specialInstructions?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  tryInDate?: string;
  tryInNotes?: string;
  adjustmentRequired?: boolean;
  adjustmentNotes?: string;
  cost?: number;
  isPaid?: boolean;
  status: LabOrderStatus;
  statusNotes?: string;
  attachments?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type LabOrderStatus =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'ready'
  | 'delivered'
  | 'rejected'
  | 'cancelled';

export interface LabOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  patientId?: string;
  doctorId?: string;
  dentalLabId?: string;
  branchId?: string;
  fromDate?: string;
  toDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface LabOrderStats {
  total: number;
  byStatus: Record<string, number>;
  overdue: number;
}

// ── Response Types ─────────────────────────────────────────

interface LabOrderListResponse {
  success: true;
  data: {
    labOrders: LabOrder[];
    pagination: PaginationMeta;
  };
}

interface LabOrderDetailResponse {
  success: true;
  data: { labOrder: LabOrder };
}

interface LabOrderStatsResponse {
  success: true;
  data: LabOrderStats;
}

// ── Query Keys ─────────────────────────────────────────────

export const labOrderKeys = {
  all: ['lab-orders'] as const,
  lists: () => [...labOrderKeys.all, 'list'] as const,
  list: (filters: LabOrderFilters) => [...labOrderKeys.lists(), filters] as const,
  details: () => [...labOrderKeys.all, 'detail'] as const,
  detail: (id: string) => [...labOrderKeys.details(), id] as const,
  stats: () => [...labOrderKeys.all, 'stats'] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useLabOrderList(filters: LabOrderFilters = {}) {
  return useQuery({
    queryKey: labOrderKeys.list(filters),
    queryFn: () =>
      apiClient.get<LabOrderListResponse>('/api/lab-orders', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.labOrders,
      meta: res.data.pagination,
    }),
  });
}

export function useLabOrderDetail(id: string) {
  return useQuery({
    queryKey: labOrderKeys.detail(id),
    queryFn: () => apiClient.get<LabOrderDetailResponse>(`/api/lab-orders/${id}`),
    select: (res) => res.data.labOrder,
    enabled: !!id,
  });
}

export function useLabOrderStats() {
  return useQuery({
    queryKey: labOrderKeys.stats(),
    queryFn: () => apiClient.get<LabOrderStatsResponse>('/api/lab-orders/stats'),
    select: (res) => res.data,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateLabOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LabOrder>) =>
      apiClient.post<ApiSuccessResponse<{ labOrder: LabOrder }>>('/api/lab-orders', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderKeys.lists() });
      qc.invalidateQueries({ queryKey: labOrderKeys.stats() });
    },
  });
}

export function useUpdateLabOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<LabOrder>) =>
      apiClient.put<ApiSuccessResponse<{ labOrder: LabOrder }>>(`/api/lab-orders/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderKeys.lists() });
      qc.invalidateQueries({ queryKey: labOrderKeys.detail(id) });
      qc.invalidateQueries({ queryKey: labOrderKeys.stats() });
    },
  });
}

export function useUpdateLabOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiClient.patch<ApiSuccessResponse<{ labOrder: LabOrder }>>(`/api/lab-orders/${id}/status`, {
        status,
        notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labOrderKeys.lists() });
      qc.invalidateQueries({ queryKey: labOrderKeys.stats() });
    },
  });
}
