import { useQuery } from '@tanstack/react-query';
import type { PaginationMeta, ErrorLog, ErrorLogFilters } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';

export type { ErrorLog, ErrorLogFilters };

interface ErrorLogListResponse {
  success: boolean;
  data: ErrorLog[];
  meta: PaginationMeta;
}

interface ErrorLogSingleResponse {
  success: boolean;
  data: ErrorLog;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const errorLogKeys = {
  all: ['error-logs'] as const,
  lists: () => [...errorLogKeys.all, 'list'] as const,
  list: (filters: ErrorLogFilters) => [...errorLogKeys.lists(), filters] as const,
  details: () => [...errorLogKeys.all, 'detail'] as const,
  detail: (id: string) => [...errorLogKeys.details(), id] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useErrorLogs(filters: ErrorLogFilters) {
  return useQuery({
    queryKey: errorLogKeys.list(filters),
    queryFn: () =>
      apiClient.get<ErrorLogListResponse>('/api/platform/error-logs', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useErrorLogDetail(id: string | null) {
  return useQuery({
    queryKey: errorLogKeys.detail(id!),
    queryFn: () => apiClient.get<ErrorLogSingleResponse>(`/api/platform/error-logs/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}
