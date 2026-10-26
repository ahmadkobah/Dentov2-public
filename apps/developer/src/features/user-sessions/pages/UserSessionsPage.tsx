import { useState } from 'react';
import { PageHeader, StatCard, DataTable, Input, Badge, Button } from '@dento/ui';
import type { ColumnDef, SortDirection } from '@dento/ui';
import { Users, UserCheck, CalendarDays, ShieldOff } from 'lucide-react';
import type { UserSessionFilters, UserSession, UserSessionStatus } from '@dento/shared';
import { useUserSessions, useSessionStats, useRevokeSession } from '../hooks/useUserSessions.js';
import { SessionDetailSheet } from '../components/SessionDetailSheet.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusVariant: Record<UserSessionStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  expired: 'secondary',
  revoked: 'destructive',
};

type StatusFilter = 'all' | UserSessionStatus;

/* ------------------------------------------------------------------ */
/*  Columns                                                            */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<UserSession>[] = [
  {
    id: 'user',
    header: 'User',
    accessorKey: 'userName',
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
    sortable: true,
  },
  {
    id: 'role',
    header: 'Role',
    accessorKey: 'role',
    cell: (v) => <span className="capitalize">{String(v)}</span>,
  },
  {
    id: 'device',
    header: 'Device',
    accessorFn: (row) => (row.device ? `${row.device.browser} / ${row.device.os}` : '—'),
  },
  {
    id: 'ip',
    header: 'IP',
    accessorKey: 'ipAddress',
    cell: (v) => <span className="font-mono text-xs">{String(v)}</span>,
  },
  {
    id: 'location',
    header: 'Location',
    accessorFn: (row) =>
      row.location ? [row.location.city, row.location.country].filter(Boolean).join(', ') : '—',
  },
  {
    id: 'loginAt',
    header: 'Login At',
    accessorKey: 'loginAt',
    sortable: true,
    cell: (v) =>
      new Date(v as string).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: (v) => (
      <Badge variant={statusVariant[v as UserSessionStatus]} className="capitalize">
        {String(v)}
      </Badge>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UserSessionsPage() {
  /* Filters */
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  /* Selected row */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters: UserSessionFilters = {
    ...(search && { search }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useUserSessions(filters);
  const { data: stats } = useSessionStats();
  const revokeSession = useRevokeSession();

  /* Action column */
  const actionColumn: ColumnDef<UserSession> = {
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
        {row.status === 'active' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            disabled={revokeSession.isPending}
            onClick={(e) => {
              e.stopPropagation();
              revokeSession.mutate(row._id);
            }}
          >
            <ShieldOff className="me-1 h-3.5 w-3.5" />
            Revoke
          </Button>
        )}
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Sessions"
        description="Monitor and manage active user sessions across all tenants."
      />

      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Stat Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Sessions"
            value={stats.activeSessions}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            title="Unique Users"
            value={stats.uniqueUsers}
            icon={<UserCheck className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Sessions Today"
            value={stats.sessionsToday}
            icon={<CalendarDays className="h-5 w-5" />}
          />
          <StatCard
            title="By Device (Mobile)"
            value={stats.sessionsByDevice?.find((d) => d.device === 'mobile')?.count ?? 0}
            icon={<Users className="h-5 w-5" />}
            variant="warning"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by email or user…"
          aria-label="Search user sessions"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-50"
        />

        {/* Status pills */}
        <div className="flex items-center gap-1 rounded-lg border p-0.5">
          {(['all', 'active', 'expired', 'revoked'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }`}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable<UserSession>
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
        emptyMessage="No sessions found."
      />

      {/* Detail Sheet */}
      <SessionDetailSheet sessionId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
