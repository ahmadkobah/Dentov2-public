import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@dento/ui';
import { apiClient } from '../../../lib/api-client.js';
import { errorLogKeys } from './useErrorLogs.js';
import { monitoringStatsKeys } from './useMonitoringStats.js';

/* ------------------------------------------------------------------ */
/*  Resolve / Unresolve Error                                          */
/* ------------------------------------------------------------------ */

export function useResolveError() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ success: boolean }>(`/api/platform/error-logs/${id}/resolve`),
    onSuccess: () => {
      toast.success('Error marked as resolved');
      qc.invalidateQueries({ queryKey: errorLogKeys.lists() });
      qc.invalidateQueries({ queryKey: monitoringStatsKeys.all });
    },
    onError: () => {
      toast.error('Failed to resolve error');
    },
  });
}

export function useUnresolveError() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<{ success: boolean }>(`/api/platform/error-logs/${id}/unresolve`),
    onSuccess: () => {
      toast.success('Error marked as unresolved');
      qc.invalidateQueries({ queryKey: errorLogKeys.lists() });
      qc.invalidateQueries({ queryKey: monitoringStatsKeys.all });
    },
    onError: () => {
      toast.error('Failed to unresolve error');
    },
  });
}
