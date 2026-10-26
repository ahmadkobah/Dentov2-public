import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import { useAuthStore } from '../../../stores/auth.store.js';

/* ------------------------------------------------------------------ */
/*  Response types                                                     */
/* ------------------------------------------------------------------ */

export interface DashboardStats {
  activeTenants: number;
  apiUsage24h: number;
  apiKeys: number;
  openTickets: number;
}

interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useDashboardStats() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiClient.get<DashboardStatsResponse>('/api/platform/dashboard/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
    enabled: isAuthenticated,
  });
}
