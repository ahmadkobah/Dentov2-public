/**
 * Audit Logs Page — per PHASE_6_FRONTEND_AUDIT.md
 * Platform-wide security and change audit trail for the admin portal.
 */

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
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDateTime as formatDate } from '@/lib/date.js';

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
const ACTION_OPTIONS = [
  'all',
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'impersonate',
  'config_change',
  'bulk_operation',
] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AuditLogsPage() {
  const { t } = useTranslation();
  // Filters
  const [search, setSearch] = useState('');
  const [sensitivityFilter, setSensitivityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorEmail, setActorEmail] = useState('');
  const [resourceType, setResourceType] = useState('');
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
      ...(actionFilter !== 'all' && { action: actionFilter as AuditLogFilters['action'] }),
      ...(actorEmail.trim() && { actorEmail: actorEmail.trim() }),
      ...(resourceType.trim() && { resourceType: resourceType.trim() }),
      page,
      limit: 15,
    }),
    [search, sensitivityFilter, statusFilter, actionFilter, actorEmail, resourceType, page],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);
  const { data: stats } = useAuditLogStats();

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  const failureCount = stats?.byStatus?.failure ?? 0;

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      id: 'createdAt',
      header: t('auditLogs.col.timestamp'),
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      id: 'actor',
      header: t('auditLogs.col.actor'),
      cell: (_val, row) => (
        <div>
          <p className="text-sm font-medium">{row.actorName ?? row.actorEmail}</p>
          <p className="text-xs text-gray-500">{row.actorRole}</p>
        </div>
      ),
    },
    {
      id: 'action',
      header: t('auditLogs.col.action'),
      cell: (_val, row) => (
        <Badge variant="secondary" className="text-xs capitalize">
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'resourceType',
      header: t('auditLogs.col.resource'),
      cell: (_val, row) => <span className="text-sm">{row.resourceType}</span>,
    },
    {
      id: 'tenantSlug',
      header: t('auditLogs.col.tenant'),
      cell: (_val, row) => <span className="text-sm font-medium">{row.tenantSlug ?? '—'}</span>,
    },
    {
      id: 'sensitivityLevel',
      header: t('auditLogs.col.sensitivity'),
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
      header: t('auditLogs.col.status'),
      cell: (_val, row) => (
        <Badge variant={statusVariant[row.status] ?? 'default'} className="text-xs capitalize">
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('auditLogs.title')} description={t('auditLogs.subtitle')} />

      {isError && (
        <ErrorState
          title={t('auditLogs.error.title')}
          message={t('auditLogs.error.desc')}
          onRetry={() => refetch()}
        />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('auditLogs.stat.today')}
          value={stats?.today ?? 0}
          icon={<Calendar className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title={t('auditLogs.stat.thisWeek')}
          value={stats?.thisWeek ?? 0}
          icon={<Activity className="h-5 w-5" />}
          variant="default"
        />
        <StatCard
          title={t('auditLogs.stat.highSensitivity')}
          value={(stats?.bySensitivity?.high ?? 0) + (stats?.bySensitivity?.critical ?? 0)}
          icon={<Shield className="h-5 w-5" />}
          variant={(stats?.bySensitivity?.critical ?? 0) > 0 ? 'error' : 'warning'}
        />
        <StatCard
          title={t('auditLogs.stat.failures')}
          value={failureCount}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={failureCount > 0 ? 'error' : 'default'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-50 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('auditLogs.filter.searchPlaceholder')}
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
            <SelectValue placeholder={t('auditLogs.filter.sensitivity')} />
          </SelectTrigger>
          <SelectContent>
            {SENSITIVITY_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all'
                  ? t('auditLogs.filter.allLevels')
                  : s.charAt(0).toUpperCase() + s.slice(1)}
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
            <SelectValue placeholder={t('auditLogs.filter.status')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all'
                  ? t('auditLogs.filter.allStatus')
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-37.5">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === 'all' ? 'All actions' : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Actor email"
          value={actorEmail}
          onChange={(e) => {
            setActorEmail(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
        <Input
          placeholder="Resource type"
          value={resourceType}
          onChange={(e) => {
            setResourceType(e.target.value);
            setPage(1);
          }}
          className="w-44"
        />
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
        emptyMessage={t('auditLogs.empty.message')}
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
