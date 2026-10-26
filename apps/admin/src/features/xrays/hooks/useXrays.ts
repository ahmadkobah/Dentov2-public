import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface Xray {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  branchId?: string;
  xrayType: string;
  toothNumbers: string[];
  title: string;
  notes?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  capturedAt?: string;
  treatmentPlanId?: string;
  treatmentPlanItemId?: string;
  procedureNoteId?: string;
  dentalChartEntryId?: string;
  clinicalPurpose?: string;
  region?: string;
  findings?: string;
  comparedToXrayId?: string;
  comparisonNotes?: string;
  annotations?: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    note: string;
    color?: string;
    createdAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface XrayFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  doctorId?: string;
  xrayType?: string;
  clinicalPurpose?: string;
  toothNumber?: string;
  treatmentPlanId?: string;
  procedureNoteId?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface XrayListResponse {
  success: true;
  data: {
    xrays: Xray[];
    pagination: PaginationMeta;
  };
}

interface XrayDetailResponse {
  success: true;
  data: { xray: Xray };
}

interface XrayArrayResponse {
  success: true;
  data: { xrays: Xray[] };
}

// ── Query Keys ─────────────────────────────────────────────

export const xrayKeys = {
  all: ['xrays'] as const,
  lists: () => [...xrayKeys.all, 'list'] as const,
  list: (filters: XrayFilters) => [...xrayKeys.lists(), filters] as const,
  details: () => [...xrayKeys.all, 'detail'] as const,
  detail: (id: string) => [...xrayKeys.details(), id] as const,
  timeline: (patientId: string) => [...xrayKeys.all, 'timeline', patientId] as const,
  tooth: (patientId: string, tooth: string) =>
    [...xrayKeys.all, 'tooth', patientId, tooth] as const,
  unlinked: (patientId: string) => [...xrayKeys.all, 'unlinked', patientId] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useXrayList(filters: XrayFilters = {}) {
  return useQuery({
    queryKey: xrayKeys.list(filters),
    queryFn: () =>
      apiClient.get<XrayListResponse>('/api/xrays', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.xrays,
      meta: res.data.pagination,
    }),
  });
}

export function useXrayDetail(id: string) {
  return useQuery({
    queryKey: xrayKeys.detail(id),
    queryFn: () => apiClient.get<XrayDetailResponse>(`/api/xrays/${id}`),
    select: (res) => res.data.xray,
    enabled: !!id,
  });
}

export function usePatientXrayTimeline(patientId: string) {
  return useQuery({
    queryKey: xrayKeys.timeline(patientId),
    queryFn: () => apiClient.get<XrayArrayResponse>(`/api/xrays/patient/${patientId}/timeline`),
    select: (res) => res.data.xrays,
    enabled: !!patientId,
  });
}

export function useXraysByTooth(patientId: string, toothNumber: string) {
  return useQuery({
    queryKey: xrayKeys.tooth(patientId, toothNumber),
    queryFn: () =>
      apiClient.get<XrayArrayResponse>(`/api/xrays/patient/${patientId}/tooth/${toothNumber}`),
    select: (res) => res.data.xrays,
    enabled: !!patientId && !!toothNumber,
  });
}

export function useUnlinkedXrays(patientId: string) {
  return useQuery({
    queryKey: xrayKeys.unlinked(patientId),
    queryFn: () => apiClient.get<XrayArrayResponse>(`/api/xrays/patient/${patientId}/unlinked`),
    select: (res) => res.data.xrays,
    enabled: !!patientId,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateXray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Xray> & { imageUrl: string }) =>
      apiClient.post<ApiSuccessResponse<{ xray: Xray }>>('/api/xrays', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: xrayKeys.lists() });
    },
  });
}

export function useUpdateXray(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Xray>) =>
      apiClient.put<ApiSuccessResponse<{ xray: Xray }>>(`/api/xrays/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: xrayKeys.lists() });
      qc.invalidateQueries({ queryKey: xrayKeys.detail(id) });
    },
  });
}

export function useDeleteXray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiSuccessResponse<unknown>>(`/api/xrays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: xrayKeys.lists() });
    },
  });
}

// ── Cross-Linking Mutations ────────────────────────────────

export interface LinkXrayInput {
  targetType: 'treatmentPlan' | 'procedureNote' | 'dentalChart';
  targetId: string;
  treatmentPlanItemId?: string;
  purpose?: 'preOp' | 'postOp' | 'linked';
}

export function useLinkXray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ xrayId, ...body }: LinkXrayInput & { xrayId: string }) =>
      apiClient.post<ApiSuccessResponse<{ xray: Xray }>>(`/api/xrays/${xrayId}/link`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: xrayKeys.all });
    },
  });
}

export function useUnlinkXray() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      xrayId,
      targetType,
      targetId,
    }: {
      xrayId: string;
      targetType: string;
      targetId: string;
    }) =>
      apiClient.post<ApiSuccessResponse<{ xray: Xray }>>(`/api/xrays/${xrayId}/unlink`, {
        targetType,
        targetId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: xrayKeys.all });
    },
  });
}
