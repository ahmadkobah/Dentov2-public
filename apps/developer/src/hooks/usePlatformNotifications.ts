import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client.js';
import { useAuthStore } from '../stores/auth.store.js';

export interface PlatformNotification {
  _id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  action?: string;
  resourceType?: string;
}

interface AuditLogEntry {
  _id: string;
  actorEmail: string;
  resourceType: string;
  action: string;
  description: string;
  createdAt: string;
  tenantSlug?: string;
  sensitivityLevel: string;
}

interface AuditLogResponse {
  success: boolean;
  data: AuditLogEntry[];
  pagination?: { total: number };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function mapToNotification(entry: AuditLogEntry): PlatformNotification {
  const actionMap: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    login: 'Login',
    logout: 'Logout',
    config_change: 'Config changed',
    export: 'Exported',
    impersonate: 'Impersonation',
  };

  const resourceMap: Record<string, string> = {
    tenant: 'Tenant',
    user: 'User',
    api_key: 'API Key',
    support_ticket: 'Support Ticket',
    webhook: 'Webhook',
    module: 'Module',
    billing: 'Billing',
    settings: 'Settings',
  };

  const actionLabel = actionMap[entry.action] ?? entry.action;
  const resourceLabel = resourceMap[entry.resourceType] ?? entry.resourceType;
  const title = `${resourceLabel} ${actionLabel}`;

  return {
    _id: entry._id,
    title,
    message: entry.description || `${actionLabel} by ${entry.actorEmail}`,
    time: timeAgo(entry.createdAt),
    read: false,
    action: entry.action,
    resourceType: entry.resourceType,
  };
}

export function usePlatformNotifications(limit = 10) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['platform-notifications', limit],
    queryFn: () =>
      apiClient.get<AuditLogResponse>('/api/platform/audit-logs', {
        params: { limit, page: 1 },
      }),
    select: (res) => {
      const entries = res.data ?? [];
      return entries.map(mapToNotification);
    },
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });
}
