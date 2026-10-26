import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import type { Deployment, DeploymentFilters, DeploymentStats, PaginationMeta } from '@dento/shared';
import { apiClient } from '../../../lib/api-client.js';

/* ------------------------------------------------------------------ */
/*  Query Keys                                                         */
/* ------------------------------------------------------------------ */

export const deploymentKeys = {
  all: ['deployments'] as const,
  lists: () => [...deploymentKeys.all, 'list'] as const,
  list: (filters: DeploymentFilters) => [...deploymentKeys.lists(), filters] as const,
  details: () => [...deploymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...deploymentKeys.details(), id] as const,
  stats: () => [...deploymentKeys.all, 'stats'] as const,
};

/* ------------------------------------------------------------------ */
/*  Response Types                                                     */
/* ------------------------------------------------------------------ */

interface DeploymentListResponse {
  success: boolean;
  data: Deployment[];
  meta: PaginationMeta;
}

interface DeploymentDetailResponse {
  success: boolean;
  data: Deployment;
}

interface DeploymentStatsResponse {
  success: boolean;
  data: DeploymentStats;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useDeployments(filters: DeploymentFilters) {
  return useQuery({
    queryKey: deploymentKeys.list(filters),
    queryFn: () =>
      apiClient.get<DeploymentListResponse>('/api/platform/deployments', {
        params: filters as Record<string, string | number | boolean>,
      }),
    select: (res) => ({ items: res.data, meta: res.meta }),
  });
}

export function useDeploymentDetail(id: string | null) {
  return useQuery({
    queryKey: deploymentKeys.detail(id!),
    queryFn: () => apiClient.get<DeploymentDetailResponse>(`/api/platform/deployments/${id}`),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useDeploymentStats() {
  return useQuery({
    queryKey: deploymentKeys.stats(),
    queryFn: () => apiClient.get<DeploymentStatsResponse>('/api/platform/deployments/stats'),
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

export function useRollback() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (deploymentId: string) =>
      apiClient.post(`/api/platform/deployments/${deploymentId}/rollback`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: deploymentKeys.all });
      toast.success('Rollback initiated successfully');
    },
    onError: () => {
      toast.error('Failed to initiate rollback');
    },
  });
}
