import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { UserSession, UserSessionFilters, UserSessionStats } from '@dento/shared';
import { toast } from '@dento/ui';

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

interface SessionListResponse {
  success: boolean;
  data: UserSession[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface SessionDetailResponse {
  success: boolean;
  data: UserSession;
}

interface SessionStatsResponse {
  success: boolean;
  data: UserSessionStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const sessionKeys = {
  all: ['user-sessions'] as const,
  lists: () => [...sessionKeys.all, 'list'] as const,
  list: (filters: UserSessionFilters) => [...sessionKeys.lists(), filters] as const,
  details: () => [...sessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...sessionKeys.details(), id] as const,
  stats: () => [...sessionKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useUserSessions(filters: UserSessionFilters) {
  return useQuery({
    queryKey: sessionKeys.list(filters),
    queryFn: () =>
      apiClient.get<SessionListResponse>('/api/platform/user-sessions', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useUserSessionDetail(id: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(id!),
    queryFn: () => apiClient.get<SessionDetailResponse>(`/api/platform/user-sessions/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useSessionStats() {
  return useQuery({
    queryKey: sessionKeys.stats(),
    queryFn: () => apiClient.get<SessionStatsResponse>('/api/platform/user-sessions/stats'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/platform/user-sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionKeys.all });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });
}
