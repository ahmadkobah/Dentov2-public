import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth.store.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SupportSession {
  _id: string;
  performedBy: {
    userId: string;
    name: string;
    email: string;
  };
  reason: string;
  startedAt: string;
  expiresAt: string;
}

interface SupportSessionResponse {
  success: boolean;
  data: SupportSession | null;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useActiveSupportSession() {
  const isAuthenticated = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: ['active-support-session'],
    queryFn: () => apiClient.get<SupportSessionResponse>('/api/tenant-support/sessions/active'),
    select: (res) => res.data,
    refetchInterval: 30_000, // Check every 30s
    retry: false,
    enabled: isAuthenticated,
  });
}
