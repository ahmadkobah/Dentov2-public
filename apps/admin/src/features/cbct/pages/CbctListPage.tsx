/**
 * CBCT Orders List Page — per DENTO_V2_MASTER_PLAN.md §10 (#12), §17.
 * DataTable with server-side pagination, search, status/priority filters.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCbctList,
  useDeleteCbctOrder,
  useUpdateCbctStatus,
  type CbctOrder,
  type CbctFilters,
} from '../hooks/useCbct.js';
import { formatDate } from '@/lib/date.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
  ConfirmDialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@dento/ui';
import {
  Plus,
  Box,
  Search,
  MoreHorizontal,
  Trash2,
  CalendarCheck,
  CheckCircle,
  FileCheck,
  XCircle,
  Eye,
} from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  requested: 'outline',
  scheduled: 'secondary',
  completed: 'default',
  reported: 'default',
  cancelled: 'destructive',
};

const PRIORITY_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  routine: 'outline',
  urgent: 'secondary',
  stat: 'destructive',
  asap: 'default',
};

export interface CbctListPageProps {
  patientId?: string;
}

export default function CbctListPage({ patientId }: CbctListPageProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<CbctFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CbctOrder | null>(null);

  const { data, isLoading, isError, error, refetch } = useCbctList({
    ...filters,
    search: search || undefined,
    ...(patientId ? { patientId } : {}),
  });

  const deleteMutation = useDeleteCbctOrder();
  const statusMutation = useUpdateCbctStatus();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('cbct.toast.deleted'));
    } catch {
      toast.error(t('cbct.toast.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      try {
        await statusMutation.mutateAsync({ id, status });
        toast.success(t('cbct.toast.statusUpdated'));
      } catch {
        toast.error(t('cbct.toast.updateFailed'));
      }
    },
    [statusMutation],
  );

  const columns: ColumnDef<CbctOrder>[] = [
    {
      id: 'orderNumber',
      accessorKey: 'orderNumber',
      header: t('cbct.col.orderNumber'),
      cell: (_v: unknown, row: CbctOrder) => (
        <span className="font-mono text-sm">{row.orderNumber}</span>
      ),
    },
    {
      id: 'patientId',
      accessorKey: 'patientId',
      header: t('cbct.col.patient'),
      cell: (_v: unknown, row: CbctOrder) => {
        // patientId is populated by the API into an object
        const p = row.patient ?? (row.patientId as unknown as CbctOrder['patient']);
        if (p && typeof p === 'object') {
          const name = `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim();
          if (name) return <span className="text-sm">{name}</span>;
        }
        return <span className="text-sm text-muted-foreground">{String(row.patientId)}</span>;
      },
    },
    {
      id: 'indication',
      accessorKey: 'indication',
      header: t('cbct.col.indication'),
      cell: (_v: unknown, row: CbctOrder) => (
        <span className="max-w-50 truncate text-sm">{row.indication}</span>
      ),
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: t('cbct.col.priority'),
      cell: (_v: unknown, row: CbctOrder) => (
        <Badge variant={PRIORITY_COLORS[row.priority] ?? 'outline'} className="capitalize">
          {row.priority}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('cbct.col.status'),
      cell: (_v: unknown, row: CbctOrder) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'scheduledDate',
      accessorKey: 'scheduledDate',
      header: t('cbct.col.scheduled'),
      cell: (_v: unknown, row: CbctOrder) => {
        const d = row.scheduledDate;
        if (!d) return <span className="text-muted-foreground">—</span>;
        return formatDate(d);
      },
    },
    {
      id: 'report',
      accessorKey: 'report',
      header: t('cbct.col.report'),
      cell: (_v: unknown, row: CbctOrder) => {
        const report = row.report;
        if (!report?.status) return <span className="text-muted-foreground">—</span>;
        const variant =
          report.status === 'final'
            ? 'default'
            : report.status === 'draft'
              ? 'outline'
              : 'secondary';
        return (
          <Badge variant={variant} className="capitalize">
            {report.status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, order: CbctOrder) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/cbct/${order._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('cbct.action.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {order.status === 'requested' && (
              <DropdownMenuItem onClick={() => handleStatusChange(order._id, 'scheduled')}>
                <CalendarCheck className="me-2 h-4 w-4" />
                {t('cbct.action.schedule')}
              </DropdownMenuItem>
            )}
            {order.status === 'scheduled' && (
              <DropdownMenuItem onClick={() => handleStatusChange(order._id, 'completed')}>
                <CheckCircle className="me-2 h-4 w-4" />
                {t('cbct.action.markCompleted')}
              </DropdownMenuItem>
            )}
            {order.status === 'completed' && (
              <DropdownMenuItem onClick={() => handleStatusChange(order._id, 'reported')}>
                <FileCheck className="me-2 h-4 w-4" />
                {t('cbct.action.markReported')}
              </DropdownMenuItem>
            )}
            {(order.status === 'requested' || order.status === 'scheduled') && (
              <DropdownMenuItem onClick={() => handleStatusChange(order._id, 'cancelled')}>
                <XCircle className="me-2 h-4 w-4" />
                {t('cbct.action.cancel')}
              </DropdownMenuItem>
            )}
            {order.status === 'requested' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(order)}
                  className="text-destructive"
                >
                  <Trash2 className="me-2 h-4 w-4" />
                  {t('cbct.action.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('cbct.title')} description={t('cbct.subtitle')}>
        <Button onClick={() => navigate('/cbct/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('cbct.newOrder')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('cbct.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              status: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('cbct.filter.allStatuses')}</SelectItem>
            <SelectItem value="requested">{t('cbct.status.pending')}</SelectItem>
            <SelectItem value="scheduled">{t('cbct.status.scheduled')}</SelectItem>
            <SelectItem value="completed">{t('cbct.status.completed')}</SelectItem>
            <SelectItem value="reported">{t('cbct.status.reported')}</SelectItem>
            <SelectItem value="cancelled">{t('cbct.status.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              priority: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-35">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('cbct.filter.allPriorities')}</SelectItem>
            <SelectItem value="routine">Routine</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="stat">Stat</SelectItem>
            <SelectItem value="asap">ASAP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState title={t('cbct.error.load')} message={error?.message} onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState
          icon={<Box className="h-6 w-6" />}
          title={t('cbct.empty.title')}
          description={t('cbct.empty.desc')}
          action={{ label: t('cbct.newOrder'), onClick: () => navigate('/cbct/new') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('cbct.confirm.deleteTitle')}
        description={`Order "${deleteTarget?.orderNumber}" will be permanently deleted. Only requested orders can be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
