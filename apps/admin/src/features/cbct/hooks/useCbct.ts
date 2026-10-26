import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface CbctScan {
  scanDate?: string;
  scannerModel?: string;
  technician?: string;
  fov?: string;
  voxelSize?: string;
  exposureParams?: string;
  dicomUrl?: string;
  displayName?: string;
  fileName?: string;
  fileSize?: number;
  notes?: string;
}

export interface CbctReport {
  radiologist?: string;
  reportDate?: string;
  findings?: string;
  impression?: string;
  recommendations?: string;
  reportUrl?: string;
  status?: 'pending' | 'draft' | 'final';
}

export interface CbctOrder {
  _id: string;
  patientId: string;
  requestingDoctorId: string;
  branchId?: string;
  orderNumber: string;
  treatmentPlanId?: string;
  treatmentPlanItemId?: string;
  procedureNoteId?: string;
  dentalChartEntryId?: string;
  indication: string;
  clinicalNotes?: string;
  priority: 'routine' | 'urgent' | 'stat' | 'asap';
  status: 'requested' | 'scheduled' | 'completed' | 'reported' | 'cancelled';
  clinicalPurpose?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scan?: CbctScan;
  report?: CbctReport;
  createdAt: string;
  updatedAt: string;
  // Populated fields from list responses
  patient?: {
    _id: string;
    firstName: { en: string; ar?: string };
    lastName: { en: string; ar?: string };
    phone?: string;
  };
  doctor?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  branch?: {
    _id: string;
    name: { en: string; ar?: string };
  };
}

export interface CbctFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  requestingDoctorId?: string;
  branchId?: string;
  status?: string;
  priority?: string;
  clinicalPurpose?: string;
  treatmentPlanId?: string;
  scheduledDateFrom?: string;
  scheduledDateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface CbctListResponse {
  success: true;
  data: {
    orders: CbctOrder[];
    pagination: PaginationMeta;
  };
}

interface CbctDetailResponse {
  success: true;
  data: { order: CbctOrder };
}

interface CbctArrayResponse {
  success: true;
  data: { orders: CbctOrder[] };
}

// ── Query Keys ─────────────────────────────────────────────

export const cbctKeys = {
  all: ['cbct'] as const,
  lists: () => [...cbctKeys.all, 'list'] as const,
  list: (filters: CbctFilters) => [...cbctKeys.lists(), filters] as const,
  details: () => [...cbctKeys.all, 'detail'] as const,
  detail: (id: string) => [...cbctKeys.details(), id] as const,
  timeline: (patientId: string) => [...cbctKeys.all, 'timeline', patientId] as const,
  unlinked: (patientId: string) => [...cbctKeys.all, 'unlinked', patientId] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useCbctList(filters: CbctFilters = {}) {
  return useQuery({
    queryKey: cbctKeys.list(filters),
    queryFn: () =>
      apiClient.get<CbctListResponse>('/api/cbct', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.orders,
      meta: res.data.pagination,
    }),
  });
}

export function useCbctDetail(id: string) {
  return useQuery({
    queryKey: cbctKeys.detail(id),
    queryFn: () => apiClient.get<CbctDetailResponse>(`/api/cbct/${id}`),
    select: (res) => res.data.order,
    enabled: !!id,
  });
}

export function usePatientCbctTimeline(patientId: string) {
  return useQuery({
    queryKey: cbctKeys.timeline(patientId),
    queryFn: () => apiClient.get<CbctArrayResponse>(`/api/cbct/patient/${patientId}/timeline`),
    select: (res) => res.data.orders,
    enabled: !!patientId,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateCbctOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CbctOrder>) =>
      apiClient.post<ApiSuccessResponse<{ order: CbctOrder }>>('/api/cbct', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.lists() });
    },
  });
}

export function useUpdateCbctOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CbctOrder>) =>
      apiClient.put<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.lists() });
      qc.invalidateQueries({ queryKey: cbctKeys.detail(id) });
    },
  });
}

export function useUpdateCbctStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${id}/status`, {
        status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.lists() });
    },
  });
}

export function useUpdateCbctScan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CbctScan) =>
      apiClient.put<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${id}/scan`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.detail(id) });
    },
  });
}

export function useUpdateCbctReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CbctReport) =>
      apiClient.put<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${id}/report`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.detail(id) });
    },
  });
}

export function useDeleteCbctOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiSuccessResponse<unknown>>(`/api/cbct/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.lists() });
    },
  });
}

// ── Unlinked Query ─────────────────────────────────────────

export function useUnlinkedCbcts(patientId: string) {
  return useQuery({
    queryKey: cbctKeys.unlinked(patientId),
    queryFn: () => apiClient.get<CbctArrayResponse>(`/api/cbct/patient/${patientId}/unlinked`),
    select: (res) => res.data.orders,
    enabled: !!patientId,
  });
}

// ── Cross-Linking Mutations ────────────────────────────────

export interface LinkCbctInput {
  targetType: 'treatmentPlan' | 'procedureNote' | 'dentalChart';
  targetId: string;
  treatmentPlanItemId?: string;
  purpose?: 'preOp' | 'postOp' | 'linked';
}

export function useLinkCbct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cbctId, ...body }: LinkCbctInput & { cbctId: string }) =>
      apiClient.post<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${cbctId}/link`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.all });
    },
  });
}

export function useUnlinkCbct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cbctId,
      targetType,
      targetId,
    }: {
      cbctId: string;
      targetType: string;
      targetId: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ order: CbctOrder }>>(`/api/cbct/${cbctId}/unlink`, {
        targetType,
        targetId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cbctKeys.all });
    },
  });
}
