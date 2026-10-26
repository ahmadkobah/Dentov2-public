import { useState } from 'react';
import { DataTable, Badge, Button, type ColumnDef, type SortDirection } from '@dento/ui';
import { Eye, CheckCircle, XCircle } from 'lucide-react';
import type { ErrorLog, ErrorLogFilters } from '../hooks/useErrorLogs.js';
import { useErrorLogs } from '../hooks/useErrorLogs.js';
import { useResolveError, useUnresolveError } from '../hooks/useResolveError.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';

interface RecentErrorsTableProps {
  filters: ErrorLogFilters;
  onSelectError: (error: ErrorLog) => void;
}

const levelVariant: Record<string, 'destructive' | 'warning' | 'default'> = {
  fatal: 'destructive',
  error: 'destructive',
  warn: 'warning',
};

export function RecentErrorsTable({ filters, onSelectError }: RecentErrorsTableProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('lastSeenAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const mergedFilters = { ...filters, page, limit: 15 };
  const { data, isLoading, isError, refetch } = useErrorLogs(mergedFilters);
  const resolve = useResolveError();
  const unresolve = useUnresolveError();

  const handleSort = (column: string, direction: SortDirection) => {
    setSortBy(column);
    setSortDir(direction);
  };

  const columns: ColumnDef<ErrorLog>[] = [
    {
      id: 'level',
      header: 'Level',
      cell: (_val, row) => (
        <Badge variant={levelVariant[row.level] ?? 'default'} className="uppercase text-xs">
          {row.level}
        </Badge>
      ),
    },
    {
      id: 'message',
      header: 'Message',
      cell: (_val, row) => (
        <span className="line-clamp-1 max-w-xs text-sm" title={row.message}>
          {row.message}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      accessorKey: 'source',
    },
    {
      id: 'occurrences',
      header: 'Count',
      accessorKey: 'occurrences',
      sortable: true,
    },
    {
      id: 'lastSeenAt',
      header: 'Last Seen',
      sortable: true,
      cell: (_val, row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.lastSeenAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (_val, row) => (
        <Badge variant={row.resolved ? 'default' : 'destructive'}>
          {row.resolved ? 'Resolved' : 'Open'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_val, row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="View details"
            aria-label="View error details"
            onClick={(e) => {
              e.stopPropagation();
              onSelectError(row);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.resolved ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Unresolve"
              aria-label="Unresolve error"
              disabled={unresolve.isPending}
              onClick={(e) => {
                e.stopPropagation();
                unresolve.mutate(row._id);
              }}
            >
              <XCircle className="h-4 w-4 text-gray-400" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Resolve"
              aria-label="Resolve error"
              disabled={resolve.isPending}
              onClick={(e) => {
                e.stopPropagation();
                resolve.mutate(row._id);
              }}
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {isError && <QueryErrorBanner onRetry={() => refetch()} />}
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
        onRowClick={onSelectError}
        emptyMessage="No errors found."
      />
    </div>
  );
}
