import { Card, CardContent, CardHeader, CardTitle, Badge, Separator, Button } from '@dento/ui';
import { HeartPulse, RefreshCw, Server } from 'lucide-react';
import { useHealthStatus } from '../hooks/useHealthStatus.js';
import {
  ComponentStatusCard,
  ComponentStatusCardSkeleton,
} from '../components/ComponentStatusCard.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { EmptyState } from '../../../components/EmptyState.js';

export default function HealthStatusPage() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } = useHealthStatus();

  const overallStatusColor: Record<string, string> = {
    ok: 'text-green-600',
    degraded: 'text-yellow-600',
    down: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Health</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Component status • Auto-refreshes every 30s
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh health status"
          title="Refresh now"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Overall Status */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">Overall Status</p>
              {data && (
                <p
                  className={`text-sm font-semibold capitalize ${overallStatusColor[data.status] ?? ''}`}
                >
                  {data.status === 'ok' ? 'All Systems Operational' : data.status}
                </p>
              )}
            </div>
          </div>
          <div className="text-end text-sm text-gray-500">
            {data?.version && <p>v{data.version}</p>}
            {data?.environment && (
              <Badge variant="secondary" className="text-xs">
                {data.environment}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Component Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            <ComponentStatusCardSkeleton />
            <ComponentStatusCardSkeleton />
            <ComponentStatusCardSkeleton />
          </>
        ) : data?.components ? (
          Object.entries(data.components).map(([name, component]) => (
            <ComponentStatusCard key={name} name={name} component={component} />
          ))
        ) : (
          <div className="col-span-full">
            <EmptyState
              icon={HeartPulse}
              title="No health checks"
              description="Health check data will appear once monitoring is configured."
            />
          </div>
        )}
      </div>

      {/* System Info */}
      {data && data.memory && (
        <>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Uptime" value={formatUptime(data.uptime)} />
            <InfoCard label="Memory RSS" value={`${data.memory.rss.toFixed(1)} MB`} />
            <InfoCard
              label="Heap Used"
              value={`${data.memory.heapUsed.toFixed(1)} / ${data.memory.heapTotal.toFixed(1)} MB`}
            />
            <InfoCard
              label="Last Check"
              value={dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
            />
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-gray-500">{label}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
