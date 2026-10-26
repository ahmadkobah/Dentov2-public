import { useQuery } from '@tanstack/react-query';
import type { ComponentStatus } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type { ComponentStatus };

export interface HealthComponent {
  status: ComponentStatus;
  latencyMs?: number;
  details?: string;
}

export interface HealthData {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  components: {
    mongo: HealthComponent;
    redis: HealthComponent;
    s3: HealthComponent;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const healthKeys = {
  all: ['health-status'] as const,
};

/* ------------------------------------------------------------------ */
/*  Query — polls every 30s                                            */
/* ------------------------------------------------------------------ */

export function useHealthStatus() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: () =>
      // Health endpoint is registered at root (no /api prefix)
      apiClient.get<HealthData>('/health'),
    refetchInterval: 30_000,
    retry: 1,
    staleTime: 15_000,
  });
}
