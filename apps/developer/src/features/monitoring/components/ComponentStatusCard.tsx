import { Card, CardContent, Badge } from '@dento/ui';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { ComponentStatus, HealthComponent } from '../hooks/useHealthStatus.js';

interface ComponentStatusCardProps {
  name: string;
  component: HealthComponent;
}

const statusConfig: Record<
  ComponentStatus,
  {
    icon: typeof CheckCircle;
    color: string;
    label: string;
    badgeVariant: 'default' | 'destructive' | 'warning';
  }
> = {
  up: {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Operational',
    badgeVariant: 'default',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Degraded',
    badgeVariant: 'warning',
  },
  down: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Down',
    badgeVariant: 'destructive',
  },
};

export function ComponentStatusCard({ name, component }: ComponentStatusCardProps) {
  const config = statusConfig[component.status];
  const Icon = config.icon;

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-full p-2 ${config.color} bg-current/10`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium capitalize">{name}</h3>
            <Badge variant={config.badgeVariant}>{config.label}</Badge>
          </div>
          {component.latencyMs !== undefined && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Latency: {component.latencyMs}ms
            </p>
          )}
          {component.details && <p className="mt-0.5 text-xs text-gray-400">{component.details}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ComponentStatusCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-full bg-gray-100 p-2 dark:bg-gray-800">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
        <div className="flex-1">
          <div className="h-5 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mt-1 h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </CardContent>
    </Card>
  );
}
