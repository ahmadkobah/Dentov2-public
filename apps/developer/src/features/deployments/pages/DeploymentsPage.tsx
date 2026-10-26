import { useState } from 'react';
import {
  PageHeader,
  StatCard,
  DataTable,
  Input,
  Badge,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@dento/ui';
import type { ColumnDef, SortDirection } from '@dento/ui';
import { Rocket, CheckCircle, Clock, CalendarDays, RotateCcw } from 'lucide-react';
import type { Deployment, DeploymentFilters, DeployApp, DeployStatus } from '@dento/shared';
import { useDeployments, useDeploymentStats, useRollback } from '../hooks/useDeployments.js';
import { DeploymentDetailSheet } from '../components/DeploymentDetailSheet.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const statusVariant: Record<DeployStatus, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  queued: 'secondary',
  building: 'warning',
  deploying: 'warning',
  success: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
  rolled_back: 'destructive',
};

type AppFilter = 'all' | DeployApp;
type StatusFilter = 'all' | DeployStatus;
type EnvFilter = 'all' | 'staging' | 'production';

const APP_OPTIONS: AppFilter[] = ['all', 'api', 'admin', 'developer', 'worker'];
const STATUS_OPTIONS: StatusFilter[] = [
  'all',
  'queued',
  'building',
  'deploying',
  'success',
  'failed',
  'cancelled',
  'rolled_back',
];
const ENV_OPTIONS: EnvFilter[] = ['all', 'staging', 'production'];

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<Deployment>[] = [
  {
    id: 'app',
    header: 'App',
    accessorKey: 'app',
    sortable: true,
    cell: (v) => <span className="font-medium capitalize">{String(v)}</span>,
  },
  {
    id: 'version',
    header: 'Version',
    accessorKey: 'version',
    cell: (v) => <span className="font-mono text-xs">{String(v)}</span>,
  },
  {
    id: 'branch',
    header: 'Branch',
    accessorKey: 'branch',
    cell: (v) => <span className="font-mono text-xs">{String(v)}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: (v) => (
      <Badge variant={statusVariant[v as DeployStatus]} className="capitalize">
        {String(v).replace('_', ' ')}
      </Badge>
    ),
  },
  {
    id: 'environment',
    header: 'Env',
    accessorKey: 'environment',
    cell: (v) => (
      <Badge variant={v === 'production' ? 'destructive' : 'secondary'} className="capitalize">
        {String(v)}
      </Badge>
    ),
  },
  {
    id: 'duration',
    header: 'Duration',
    accessorKey: 'duration',
    cell: (v) => formatDuration(v as number | null),
  },
  {
    id: 'triggeredBy',
    header: 'Triggered By',
    accessorKey: 'triggeredBy',
    sortable: true,
  },
  {
    id: 'startedAt',
    header: 'Date',
    accessorKey: 'startedAt',
    sortable: true,
    cell: (v) => formatDate(v as string),
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DeploymentsPage() {
  /* Filters */
  const [appFilter, setAppFilter] = useState<AppFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [branchSearch, setBranchSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  /* Selected row */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters: DeploymentFilters = {
    ...(appFilter !== 'all' && { app: appFilter }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(envFilter !== 'all' && { environment: envFilter }),
    ...(branchSearch && { branch: branchSearch }),
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useDeployments(filters);
  const { data: stats } = useDeploymentStats();
  const rollback = useRollback();

  /* Action column */
  const actionColumn: ColumnDef<Deployment> = {
    id: 'actions',
    header: '',
    cell: (_v, row) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedId(row._id);
          }}
        >
          View
        </Button>
        {row.status === 'success' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-orange-600"
            disabled={rollback.isPending}
            onClick={(e) => {
              e.stopPropagation();
              rollback.mutate(row._id);
            }}
          >
            <RotateCcw className="me-1 h-3.5 w-3.5" />
            Rollback
          </Button>
        )}
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployments"
        description="Track and manage deployments across all applications and environments."
      />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stat Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Deployments"
            value={stats.totalDeployments}
            icon={<Rocket className="h-5 w-5" />}
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            icon={<CheckCircle className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Avg Duration"
            value={formatDuration(stats.avgDuration)}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Today's Deploys"
            value={stats.deploymentsToday}
            icon={<CalendarDays className="h-5 w-5" />}
            variant="warning"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by branch…"
          aria-label="Filter deployments by branch"
          value={branchSearch}
          onChange={(e) => {
            setBranchSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-44"
        />

        {/* App filter */}
        <Select
          value={appFilter}
          onValueChange={(v) => {
            setAppFilter(v as AppFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Apps" />
          </SelectTrigger>
          <SelectContent>
            {APP_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all' ? 'All Apps' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all'
                  ? 'All Statuses'
                  : opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Environment filter */}
        <Select
          value={envFilter}
          onValueChange={(v) => {
            setEnvFilter(v as EnvFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Envs" />
          </SelectTrigger>
          <SelectContent>
            {ENV_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all' ? 'All Environments' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable<Deployment>
        columns={[...columns, actionColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageSize={20}
        currentPage={page}
        totalItems={data?.meta?.total ?? 0}
        onPageChange={setPage}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
        rowKey={(row) => row._id}
        onRowClick={(row) => setSelectedId(row._id)}
        emptyMessage="No deployments found."
      />

      {/* Detail Sheet */}
      <DeploymentDetailSheet deploymentId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
