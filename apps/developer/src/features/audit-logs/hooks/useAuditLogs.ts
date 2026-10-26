import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { AuditLogEntry, AuditLogFilters, AuditLogStats } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface AuditLogListResponse {
  success: boolean;
  data: AuditLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface AuditLogDetailResponse {
  success: boolean;
  data: AuditLogEntry;
}

interface AuditLogStatsResponse {
  success: boolean;
  data: AuditLogStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogFilters) => [...auditLogKeys.lists(), filters] as const,
  details: () => [...auditLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditLogKeys.details(), id] as const,
  stats: () => [...auditLogKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: () =>
      apiClient.get<AuditLogListResponse>('/api/platform/audit-logs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useAuditLogDetail(id: string | null) {
  return useQuery({
    queryKey: auditLogKeys.detail(id!),
    queryFn: () => apiClient.get<AuditLogDetailResponse>(`/api/platform/audit-logs/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useAuditLogStats() {
  return useQuery({
    queryKey: auditLogKeys.stats(),
    queryFn: () => apiClient.get<AuditLogStatsResponse>('/api/platform/audit-logs/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}
