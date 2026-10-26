import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { SystemLog, SystemLogFilters, SystemLogStats } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Re-export for page usage                                           */
/* ------------------------------------------------------------------ */

export type SystemLogEntry = SystemLog;

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface SystemLogListResponse {
  success: boolean;
  data: SystemLogEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface SystemLogStatsResponse {
  success: boolean;
  data: SystemLogStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const systemLogKeys = {
  all: ['system-logs'] as const,
  lists: () => [...systemLogKeys.all, 'list'] as const,
  list: (filters: SystemLogFilters) => [...systemLogKeys.lists(), filters] as const,
  stats: (hours: number) => [...systemLogKeys.all, 'stats', hours] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useSystemLogs(filters: SystemLogFilters) {
  return useQuery({
    queryKey: systemLogKeys.list(filters),
    queryFn: () =>
      apiClient.get<SystemLogListResponse>('/api/platform/system-logs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useSystemLogStats(hours: number = 24) {
  return useQuery({
    queryKey: systemLogKeys.stats(hours),
    queryFn: () =>
      apiClient.get<SystemLogStatsResponse>('/api/platform/system-logs/stats', {
        params: { hours },
      }),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}
