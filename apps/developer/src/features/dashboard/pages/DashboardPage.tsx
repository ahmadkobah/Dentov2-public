import { Card, CardContent, CardHeader, CardTitle } from '@dento/ui';
import { Building2, Activity, Key, Ticket, RefreshCw } from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboard.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

const statsMeta = [
  {
    key: 'activeTenants' as const,
    title: 'Active Tenants',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
  },
  {
    key: 'apiUsage24h' as const,
    title: 'API Usage (24h)',
    icon: Activity,
    color: 'text-green-600',
    bg: 'bg-green-100',
  },
  {
    key: 'apiKeys' as const,
    title: 'API Keys',
    icon: Key,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
  },
  {
    key: 'openTickets' as const,
    title: 'Open Tickets',
    icon: Ticket,
    color: 'text-red-600',
    bg: 'bg-red-100',
  },
];

export default function DashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800 dark:text-white">Platform Dashboard</h1>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsMeta.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold">
                    {isLoading ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                    ) : (
                      (stats?.[stat.key]?.toLocaleString() ?? '—')
                    )}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Developer Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Full developer portal with tenant management, module configuration, API keys, webhooks,
            and platform analytics will be implemented in Phase 5.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
