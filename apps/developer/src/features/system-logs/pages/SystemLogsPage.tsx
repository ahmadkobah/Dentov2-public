import { useState, useMemo } from 'react';
import {
  PageHeader,
  StatCard,
  DataTable,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ColumnDef,
  type SortDirection,
} from '@dento/ui';
import { Server, AlertTriangle, Bug, Activity, Search } from 'lucide-react';
import type { SystemLogFilters, SystemLogLevel } from '@dento/shared';
import type { SystemLogEntry } from '../hooks/useSystemLogs.js';
import { useSystemLogs, useSystemLogStats } from '../hooks/useSystemLogs.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { formatDateFull as formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getLevelCount(
  byLevel: { _id: string; count: number }[] | undefined,
  level: string,
): number {
  if (!byLevel) return 0;
  return byLevel.find((b) => b._id === level)?.count ?? 0;
}

const levelVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  trace: 'secondary',
  debug: 'secondary',
  info: 'default',
  warn: 'warning',
  error: 'destructive',
  fatal: 'destructive',
};

const LEVEL_OPTIONS = ['all', 'trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;
const SOURCE_OPTIONS = ['all', 'api', 'admin', 'developer', 'worker'] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SystemLogsPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const filters: SystemLogFilters = useMemo(
    () => ({
      ...(search && { search }),
      ...(levelFilter !== 'all' && { level: levelFilter as SystemLogLevel }),
      ...(sourceFilter !== 'all' && { source: sourceFilter }),
      page,
      limit: 15,
    }),
    [search, levelFilter, sourceFilter, page],
  );

  const { data, isLoading, isError, refetch } = useSystemLogs(filters);
  const { data: stats } = useSystemLogStats(24);

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  const columns: ColumnDef<SystemLogEntry>[] = [
    {
      id: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.timestamp)}</span>
      ),
    },
    {
      id: 'level',
      header: 'Level',
      cell: (_val, row) => (
        <Badge variant={levelVariant[row.level] ?? 'default'} className="text-xs uppercase">
          {row.level}
        </Badge>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: (_val, row) => <span className="text-sm capitalize">{row.source}</span>,
    },
    {
      id: 'message',
      header: 'Message',
      cell: (_val, row) => (
        <span className="line-clamp-1 max-w-md text-sm" title={row.message}>
          {row.message}
        </span>
      ),
    },
    {
      id: 'tenantSlug',
      header: 'Tenant',
      cell: (_val, row) => <span className="text-sm">{row.tenantSlug ?? '—'}</span>,
    },
    {
      id: 'requestId',
      header: 'Request ID',
      cell: (_val, row) => (
        <span className="font-mono text-xs text-gray-500">
          {row.requestId ? row.requestId.slice(0, 12) + '…' : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="System Logs" description="Server-side log viewer and diagnostics" />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Logs (24h)"
          value={stats?.totalLogs ?? 0}
          icon={<Server className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="Errors"
          value={getLevelCount(stats?.byLevel, 'error')}
          icon={<Bug className="h-5 w-5" />}
          variant={getLevelCount(stats?.byLevel, 'error') > 0 ? 'error' : 'default'}
        />
        <StatCard
          title="Warnings"
          value={getLevelCount(stats?.byLevel, 'warn')}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={getLevelCount(stats?.byLevel, 'warn') > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Error Rate"
          value={stats?.errorRate != null ? `${stats.errorRate.toFixed(1)}%` : '—'}
          icon={<Activity className="h-5 w-5" />}
          variant={(stats?.errorRate ?? 0) > 5 ? 'error' : 'success'}
        />
      </div>

      {/* Level pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search logs…"
            aria-label="Search system logs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-500">Level:</span>
          {LEVEL_OPTIONS.map((level) => (
            <Button
              key={level}
              variant={levelFilter === level ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs capitalize"
              onClick={() => {
                setLevelFilter(levelFilter === level ? 'all' : level);
                setPage(1);
              }}
            >
              {level === 'all' ? 'All' : level}
            </Button>
          ))}
        </div>
        <Select
          value={sourceFilter}
          onValueChange={(v) => {
            setSourceFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-35">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageSize={15}
        currentPage={page}
        totalItems={data?.meta?.total}
        onPageChange={setPage}
        sortColumn={sortBy}
        sortDirection={sortDir}
        onSort={handleSort}
        rowKey={(row) => row._id}
        emptyMessage="No system logs found."
      />
    </div>
  );
}
