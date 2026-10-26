import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client.js';

export interface AuditLogEntry {
  _id: string;
  action: string;
  resourceType: string;
  actorEmail?: string;
  description?: string;
  status: string;
  createdAt: string;
}

interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export function useTenantRecentActivity(tenantSlug: string | undefined) {
  return useQuery({
    queryKey: ['tenant-recent-activity', tenantSlug],
    queryFn: () =>
      apiClient.get<AuditLogResponse>('/api/platform/audit-logs', {
        params: { tenantSlug, limit: 5, page: 1 },
      }),
    enabled: !!tenantSlug,
    staleTime: 60_000,
  });
}
