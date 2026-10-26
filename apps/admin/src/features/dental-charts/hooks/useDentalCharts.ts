/**
 * Dental Chart React Query hooks — per BUILD_RULES §8.3.
 * CRUD queries + mutations for dental chart feature.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';

// ── Types ───────────────────────────────────────────────────

export interface DentalChartEntry {
  _id: string;
  patientId: string;
  toothNumber: number;
  numberingSystem: 'universal' | 'fdi';
  condition: string;
  surfaces: string[];
  perioData?: {
    pocketDepth?: number[];
    recession?: number[];
    bleedingOnProbing?: boolean[];
    mobility?: number;
    furcation?: number;
  };
  notes?: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type SnapshotTrigger = 'manual' | 'tooth_update' | 'procedure_note' | 'treatment_plan';

export interface SnapshotChartData {
  entries: DentalChartEntry[];
  procedureNoteTeeth: { toothNumber: number; procedureName: string; entryIndex?: number }[];
  capturedAt: string;
}

export interface ChartHistorySnapshot {
  _id: string;
  patientId: string;
  trigger?: SnapshotTrigger;
  chartData: SnapshotChartData;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
}

interface ChartResponse {
  success: true;
  data: { entries: DentalChartEntry[]; total: number };
}

interface ChartEntryResponse {
  success: true;
  data: { entry: DentalChartEntry };
}

interface HistoryListResponse {
  success: true;
  data: {
    snapshots: ChartHistorySnapshot[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

// ── Queries ─────────────────────────────────────────────────

export function useDentalChart(patientId: string | undefined) {
  return useQuery({
    queryKey: ['dental-charts', patientId],
    queryFn: () =>
      apiClient.get<ChartResponse>('/api/dental-charts', {
        params: { patientId: patientId! },
      }),
    enabled: !!patientId,
    select: (res) => res.data,
  });
}

export function useChartHistory(patientId: string | undefined, page = 1) {
  return useQuery({
    queryKey: ['dental-chart-history', patientId, page],
    queryFn: () =>
      apiClient.get<HistoryListResponse>('/api/dental-charts/history', {
        params: { patientId: patientId!, page, limit: 10 },
      }),
    enabled: !!patientId,
    select: (res) => res.data,
    staleTime: 0,
  });
}

/**
 * Fetch the most recent chart snapshot for a patient.
 * Useful for read-only views (e.g. TreatmentPlanDetailPage) where
 * the live scratch-pad is typically empty after a snapshot wipe.
 */
export function useLatestChartSnapshot(patientId: string | undefined) {
  return useQuery({
    queryKey: ['dental-chart-history', patientId, 'latest'],
    queryFn: () =>
      apiClient.get<HistoryListResponse>('/api/dental-charts/history', {
        params: { patientId: patientId!, page: 1, limit: 1 },
      }),
    enabled: !!patientId,
    select: (res) => {
      const snapshot = res.data?.snapshots?.[0];
      return snapshot?.chartData?.entries ?? [];
    },
  });
}

// ── Mutations ───────────────────────────────────────────────

export function useUpsertChartEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      patientId: string;
      toothNumber: number;
      condition: string;
      surfaces?: string[];
      numberingSystem?: string;
      perioData?: Record<string, unknown>;
      notes?: string;
    }) => apiClient.post<ChartEntryResponse>('/api/dental-charts', data),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['dental-charts', vars.patientId] });
    },
  });
}

export function useDeleteChartEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<unknown>(`/api/dental-charts/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dental-charts'] });
    },
  });
}

export function useCreateChartSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { patientId: string; notes?: string }) =>
      apiClient.post<unknown>('/api/dental-charts/history', data),
    onSuccess: (_res, vars) => {
      void qc.invalidateQueries({ queryKey: ['dental-chart-history', vars.patientId] });
    },
  });
}
