import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { ApiSuccessResponse, PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export type ScanType =
  | 'full_arch'
  | 'upper_arch'
  | 'lower_arch'
  | 'bite_registration'
  | 'single_tooth'
  | 'other';

export type ScanStatus = 'uploaded' | 'ready' | 'error';

export interface Scan {
  _id: string;
  scanNumber: string;
  patientId: string;
  doctorId: string;
  branchId?: string;

  scanType: ScanType;
  scannerModel?: string;
  scanDate?: string;
  notes?: string;
  status: ScanStatus;

  fileKey: string;
  fileSizeMB: number;
  originalSizeMB?: number;
  fileCount: number;
  formats: string[];

  treatmentPlanId?: string;
  appointmentId?: string;

  createdAt: string;
  updatedAt: string;

  // Populated fields
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

export interface ScanFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  doctorId?: string;
  branchId?: string;
  scanType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: string;
}

// ── Response Types ─────────────────────────────────────────

interface ScanListResponse {
  success: true;
  data: {
    scans: Scan[];
    pagination: PaginationMeta;
  };
}

interface ScanDetailResponse {
  success: true;
  data: { scan: Scan };
}

interface ScanArrayResponse {
  success: true;
  data: { scans: Scan[] };
}

// ── Query Keys ─────────────────────────────────────────────

export const scanKeys = {
  all: ['scans'] as const,
  lists: () => [...scanKeys.all, 'list'] as const,
  list: (filters: ScanFilters) => [...scanKeys.lists(), filters] as const,
  details: () => [...scanKeys.all, 'detail'] as const,
  detail: (id: string) => [...scanKeys.details(), id] as const,
  patient: (patientId: string) => [...scanKeys.all, 'patient', patientId] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useScanList(filters: ScanFilters = {}) {
  return useQuery({
    queryKey: scanKeys.list(filters),
    queryFn: () =>
      apiClient.get<ScanListResponse>('/api/scans', {
        params: filters as unknown as Record<string, string>,
      }),
    select: (res) => ({
      items: res.data.scans,
      meta: res.data.pagination,
    }),
  });
}

export function useScanDetail(id: string) {
  return useQuery({
    queryKey: scanKeys.detail(id),
    queryFn: () => apiClient.get<ScanDetailResponse>(`/api/scans/${id}`),
    select: (res) => res.data.scan,
    enabled: !!id,
  });
}

export function usePatientScans(patientId: string) {
  return useQuery({
    queryKey: scanKeys.patient(patientId),
    queryFn: () => apiClient.get<ScanArrayResponse>(`/api/scans/patient/${patientId}`),
    select: (res) => res.data.scans,
    enabled: !!patientId,
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useCreateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Scan>) =>
      apiClient.post<ApiSuccessResponse<{ scan: Scan }>>('/api/scans', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scanKeys.lists() });
    },
  });
}

export function useUpdateScan(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Scan>) =>
      apiClient.put<ApiSuccessResponse<{ scan: Scan }>>(`/api/scans/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scanKeys.lists() });
      qc.invalidateQueries({ queryKey: scanKeys.detail(id) });
    },
  });
}

export function useDeleteScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<ApiSuccessResponse<unknown>>(`/api/scans/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scanKeys.lists() });
    },
  });
}

export function useMarkScanReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<ApiSuccessResponse<{ scan: Scan }>>(`/api/scans/${id}/ready`, {}),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: scanKeys.detail(id) });
      qc.invalidateQueries({ queryKey: scanKeys.lists() });
    },
  });
}
