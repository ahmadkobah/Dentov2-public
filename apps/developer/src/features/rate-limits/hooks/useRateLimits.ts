import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TierConsumer {
  key: string;
  count: number;
  max: number;
  blocked: boolean;
}

interface TierStat {
  tier: string;
  activeKeys: number;
  blockedKeys: number;
  topConsumers: TierConsumer[];
  config: { max: number; timeWindow: string };
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    summary: {
      totalActiveKeys: number;
      totalBlockedKeys: number;
      tiersScanned: number;
    };
    tiers: TierStat[];
  };
}

interface Violation {
  tier: string;
  key: string;
  count: number;
  max: number;
  ttl: number;
}

interface ViolationsResponse {
  success: boolean;
  data: {
    total: number;
    violations: Violation[];
  };
}

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const rateLimitKeys = {
  all: ['rate-limits'] as const,
  analytics: (tier: string) => [...rateLimitKeys.all, 'analytics', tier] as const,
  violations: () => [...rateLimitKeys.all, 'violations'] as const,
};

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

export function useRateLimitAnalytics(tier: string = 'all') {
  return useQuery({
    queryKey: rateLimitKeys.analytics(tier),
    queryFn: () =>
      apiClient.get<AnalyticsResponse>('/api/platform/analytics/rate-limits', {
        params: { tier, limit: 20 },
      }),
    select: (res) => res.data,
    refetchInterval: 30_000, // poll every 30s for live dashboard
  });
}

export function useRateLimitViolations() {
  return useQuery({
    queryKey: rateLimitKeys.violations(),
    queryFn: () =>
      apiClient.get<ViolationsResponse>('/api/platform/analytics/rate-limits/violations'),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useUpdateRateLimit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { tier: string; max: number; timeWindow: string }) =>
      apiClient.patch(`/api/platform/rate-limits/${data.tier}`, {
        max: data.max,
        timeWindow: data.timeWindow,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rateLimitKeys.all });
    },
  });
}
