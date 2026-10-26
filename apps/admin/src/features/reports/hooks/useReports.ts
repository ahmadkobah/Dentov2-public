import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import { useAuthStore } from '@/stores/auth.store.js';
import type { ApiSuccessResponse } from '@/lib/types.js';
import type {
  ReportQueryParams as ReportQuery,
  IDashboardStats as DashboardStats,
  IDashboardTrends as DashboardTrends,
  IReportSchedule as ReportSchedule,
  IReportHistory as ReportHistory,
} from '@dento/shared';

// ── Frontend-specific Types ────────────────────────────

export type { ReportQuery, DashboardStats, DashboardTrends, ReportSchedule, ReportHistory };

export interface ReportData {
  locked: boolean;
  reportType: string;
  category: string;
  generatedAt?: string;
  period?: { from?: string; to?: string };
  summary?: Record<string, number>;
  chart?: unknown[];
  table?: unknown[];
  name?: { en: string; ar: string };
  description?: { en: string; ar: string };
  previewData?: unknown;
  upgradeMessage?: { en: string; ar: string };
  // Pipeline-specific fields
  [key: string]: unknown;
}

// ── Query Keys ──────────────────────────────────────────

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  catalog: () => [...reportKeys.all, 'catalog'] as const,
  financial: (type: string, q: ReportQuery) => [...reportKeys.all, 'financial', type, q] as const,
  patient: (type: string, q: ReportQuery) => [...reportKeys.all, 'patient', type, q] as const,
  appointment: (type: string, q: ReportQuery) =>
    [...reportKeys.all, 'appointment', type, q] as const,
  clinical: (type: string, q: ReportQuery) => [...reportKeys.all, 'clinical', type, q] as const,
  operational: (type: string, q: ReportQuery) =>
    [...reportKeys.all, 'operational', type, q] as const,
  saved: () => [...reportKeys.all, 'saved'] as const,
  scheduled: () => [...reportKeys.all, 'scheduled'] as const,
  history: () => [...reportKeys.all, 'history'] as const,
};

// ── Dashboard Hooks ─────────────────────────────────────

export function useDashboardStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => apiClient.get<ApiSuccessResponse<DashboardStats>>('/api/dashboard/stats'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

// ── Report Data Hooks ───────────────────────────────────

export function useFinancialReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.financial(type, query),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/financial/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

export function usePatientReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.patient(type, query),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/patients/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

export function useAppointmentReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.appointment(type, query),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/appointments/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

export function useClinicalReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.clinical(type, query),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/clinical/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

export function useOperationalReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: reportKeys.operational(type, query),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/operational/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

export function useInventoryReport(type: string, query: ReportQuery = {}) {
  return useQuery({
    queryKey: [...reportKeys.all, 'inventory', type, query] as const,
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<ReportData>>(`/api/reports/inventory/${type}`, {
        params: query as unknown as Record<string, string>,
      }),
    select: (res) => res.data,
    enabled: !!type,
  });
}

// ── Dashboard Trends Hook ───────────────────────────────

export function useDashboardTrends() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: [...reportKeys.dashboard(), 'trends'] as const,
    queryFn: () => apiClient.get<ApiSuccessResponse<DashboardTrends>>('/api/dashboard/trends'),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
}

// ── Category Report Hook (dynamic dispatch) ─────────────

const CATEGORY_HOOKS: Record<
  string,
  (type: string, q: ReportQuery) => ReturnType<typeof useFinancialReport>
> = {
  financial: useFinancialReport,
  patient: usePatientReport,
  appointment: useAppointmentReport,
  clinical: useClinicalReport,
  operational: useOperationalReport,
  inventory: useInventoryReport,
};

export function useReport(category: string, type: string, query: ReportQuery = {}) {
  const hookFn = CATEGORY_HOOKS[category] ?? useFinancialReport;
  return hookFn(type, query);
}

// ── Schedule & History (types from @dento/shared) ───────

// ── Schedule Hooks ──────────────────────────────────────

export function useScheduleList() {
  return useQuery({
    queryKey: reportKeys.scheduled(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ schedules: ReportSchedule[]; total: number }>>(
        '/api/reports/scheduled',
      ),
    select: (res) => res.data,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<
        ReportSchedule,
        '_id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'isActive' | 'lastRunAt' | 'nextRunAt'
      >,
    ) =>
      apiClient.post<ApiSuccessResponse<{ schedule: ReportSchedule }>>(
        '/api/reports/scheduled',
        data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.scheduled() }),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ReportSchedule>) =>
      apiClient.patch<ApiSuccessResponse<{ schedule: ReportSchedule }>>(
        `/api/reports/scheduled/${id}`,
        data,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.scheduled() }),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiSuccessResponse<unknown>>(`/api/reports/scheduled/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.scheduled() }),
  });
}

export function useRunScheduleNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiSuccessResponse<{ historyId: string; status: string }>>(
        `/api/reports/scheduled/${id}/run`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.history() }),
  });
}

// ── History Hooks ───────────────────────────────────────

export function useReportHistory() {
  return useQuery({
    queryKey: reportKeys.history(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ history: ReportHistory[]; total: number }>>(
        '/api/reports/history',
      ),
    select: (res) => res.data,
  });
}

// ── Export Hook ─────────────────────────────────────────

// ── Saved Reports Hook ──────────────────────────────────

export interface SavedReport {
  _id: string;
  name: string;
  category: string;
  reportType: string;
  filters?: Record<string, unknown>;
  savedAt: string;
}

export function useSavedReports() {
  return useQuery({
    queryKey: reportKeys.saved(),
    queryFn: () =>
      apiClient.get<ApiSuccessResponse<{ reports: SavedReport[] }>>('/api/reports/saved'),
    select: (res) => res.data.reports,
  });
}

export function useDeleteSavedReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/reports/saved/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.saved() });
    },
  });
}

// ── Export Report Hook ──────────────────────────────────

export interface ExportReportParams {
  category: string;
  reportType: string;
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, unknown>;
}

export function useExportReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExportReportParams) =>
      apiClient.post<ApiSuccessResponse<{ historyId: string; status: string }>>(
        '/api/reports/export',
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reportKeys.history() });
    },
  });
}
