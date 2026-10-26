import { useState, useMemo } from 'react';
import {
  PageHeader,
  StatCard,
  DataTable,
  Badge,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ColumnDef,
  type SortDirection,
} from '@dento/ui';
import { Shield, AlertTriangle, Calendar, Activity, Search } from 'lucide-react';
import type { AuditLogEntry, AuditLogFilters } from '@dento/shared';
import { useAuditLogs, useAuditLogStats } from '../hooks/useAuditLogs.js';
import { AuditLogDetailSheet } from '../components/AuditLogDetailSheet.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { formatDate } from '../../../lib/date.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const sensitivityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
};

const statusVariant: Record<string, 'default' | 'destructive'> = {
  success: 'default',
  failure: 'destructive',
};

const SENSITIVITY_OPTIONS = ['all', 'low', 'medium', 'high', 'critical'] as const;
const STATUS_OPTIONS = ['all', 'success', 'failure'] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  // Filters
  const [search, setSearch] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Selected entry for detail sheet
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filters: AuditLogFilters = useMemo(
    () => ({
      ...(search && { search }),
      ...(sensitivityFilter !== 'all' && {
        sensitivityLevel: sensitivityFilter as AuditLogFilters['sensitivityLevel'],
      }),
      ...(statusFilter !== 'all' && { status: statusFilter as 'success' | 'failure' }),
      page,
      limit: 15,
    }),
    [search, sensitivityFilter, statusFilter, page],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);
  const { data: stats } = useAuditLogStats();

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      id: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'actor',
      header: 'Actor',
      cell: (_val, row) => (
        <div>
          <p className="text-sm font-medium">{row.actorName ?? row.actorEmail}</p>
          <p className="text-xs text-gray-500">{row.actorRole}</p>
        </div>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: (_val, row) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'resourceType',
      header: 'Resource',
      cell: (_val, row) => <span className="text-sm">{row.resourceType}</span>,
    },
    {
      id: 'tenantSlug',
      header: 'Tenant',
      cell: (_val, row) => <span className="text-sm font-medium">{row.tenantSlug ?? '—'}</span>,
    },
    {
      id: 'sensitivityLevel',
      header: 'Sensitivity',
      cell: (_val, row) => (
        <Badge
          variant={sensitivityVariant[row.sensitivityLevel] ?? 'default'}
          className="text-xs capitalize"
        >
          {row.sensitivityLevel}
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={statusVariant[row.status] ?? 'default'} className="text-xs capitalize">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" description="Platform-wide security and change audit trail" />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today"
          value={stats?.today ?? 0}
          icon={<Calendar className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="This Week"
          value={stats?.thisWeek ?? 0}
          icon={<Activity className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title="High Sensitivity"
          value={(stats?.bySensitivity?.high ?? 0) + (stats?.bySensitivity?.critical ?? 0)}
          icon={<Shield className="h-5 w-5" />}
          variant={(stats?.bySensitivity?.critical ?? 0) > 0 ? 'error' : 'warning'}
        />
        <StatCard
          title="Failures"
          value={stats?.byStatus?.failure ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={(stats?.byStatus?.failure ?? 0) > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search logs…"
            aria-label="Search audit logs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-9"
          />
        </div>
        <Select
          value={sensitivityFilter}
          onValueChange={(v) => {
            setSensitivityFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-37.5">
            <SelectValue placeholder="Sensitivity" />
          </SelectTrigger>
          <SelectContent>
            {SENSITIVITY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Levels' : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-32.5">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
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
        onRowClick={setSelectedEntry}
        emptyMessage="No audit logs found."
      />

      {/* Detail Sheet */}
      <AuditLogDetailSheet
        auditLog={selectedEntry}
        open={!!selectedEntry}
        onOpenChange={(open) => !open && setSelectedEntry(null)}
      />
    </div>
  );
}
