import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import type { UserSession, UserSessionStatus } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';
import type { PaginationMeta } from '../../../lib/types.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SessionFilters {
  status?: UserSessionStatus;
  page?: number;
  limit?: number;
}

interface SessionListResponse {
  success: boolean;
  data: { sessions: UserSession[] };
  meta?: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useAdminSessions(filters: SessionFilters = {}) {
  return useQuery({
    queryKey: ['admin-sessions', filters],
    queryFn: () =>
      apiClient.get<SessionListResponse>('/api/auth/sessions', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data.sessions ?? [], meta: res.meta }),
  });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => apiClient.delete(`/api/auth/sessions/${sessionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
  });
}

export function useRevokeAllSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete('/api/auth/sessions'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success('All other sessions revoked');
    },
    onError: () => {
      toast.error('Failed to revoke sessions');
    },
  });
}
