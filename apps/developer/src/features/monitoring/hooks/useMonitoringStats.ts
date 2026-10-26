import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';
import type { ErrorStats } from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StatsResponse {
  success: boolean;
  data: ErrorStats;
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const monitoringStatsKeys = {
  all: ['monitoring-stats'] as const,
  stats: (hours: number) => [...monitoringStatsKeys.all, hours] as const,
};

/* ------------------------------------------------------------------ */
/*  Query                                                              */
/* ------------------------------------------------------------------ */

export function useMonitoringStats(hours: number = 24) {
  return useQuery({
    queryKey: monitoringStatsKeys.stats(hours),
    queryFn: () =>
      apiClient.get<StatsResponse>('/api/platform/error-logs/stats', {
        params: { hours },
      }),
    select: (res) => res.data,
    refetchInterval: 60_000, // poll every 60s
  });
}
