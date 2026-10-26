/**
 * Lab Order List Page — per DENTO_V2_MASTER_PLAN.md §10 (#13).
 * DataTable with server-side pagination, search, status + lab filters.
 * Status flow: draft → sent → in_progress → ready → delivered | rejected | cancelled
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useLabOrderList,
  useLabOrderStats,
  useUpdateLabOrderStatus,
  type LabOrder,
  type LabOrderFilters,
} from '../hooks/useLabOrders.js';
import { formatDate } from '@/lib/date.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency } from '@/lib/currency.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
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
  Card,
  CardContent,
} from '@dento/ui';
import {
  FlaskConical,
  Search,
  MoreHorizontal,
  Send,
  Play,
  CheckCircle,
  Package,
  XCircle,
  RotateCcw,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import LabOrderCreateDialog from '../components/LabOrderCreateDialog.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  sent: 'secondary',
  in_progress: 'default',
  ready: 'default',
  delivered: 'secondary',
  rejected: 'destructive',
  cancelled: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  in_progress: 'In Progress',
  ready: 'Ready',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

// Valid next statuses per current status
const NEXT_STATUS: Record<string, { status: string; label: string; icon: typeof Send }[]> = {
  draft: [
    { status: 'sent', label: 'Send to Lab', icon: Send },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  sent: [
    { status: 'in_progress', label: 'Mark In Progress', icon: Play },
    { status: 'rejected', label: 'Reject', icon: XCircle },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  in_progress: [
    { status: 'ready', label: 'Mark Ready', icon: CheckCircle },
    { status: 'rejected', label: 'Reject', icon: XCircle },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  ready: [
    { status: 'delivered', label: 'Mark Delivered', icon: Package },
    { status: 'cancelled', label: 'Cancel', icon: XCircle },
  ],
  rejected: [{ status: 'draft', label: 'Reopen as Draft', icon: RotateCcw }],
  cancelled: [{ status: 'draft', label: 'Reopen as Draft', icon: RotateCcw }],
};

interface LabOrderListPageProps {
  patientId?: string;
}

export default function LabOrderListPage({ patientId }: LabOrderListPageProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const [filters, setFilters] = useState<LabOrderFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...(patientId ? { patientId } : {}),
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useLabOrderList({
    ...filters,
    search: search || undefined,
  });

  const statusMutation = useUpdateLabOrderStatus();
  const { data: stats } = useLabOrderStats();
  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      try {
        await statusMutation.mutateAsync({ id, status });
        toast.success(
          t('labOrders.toast.statusUpdated', {
            status: t(`labOrders.status.${status}`, {
              defaultValue: STATUS_LABELS[status] ?? status,
            }),
          }),
        );
      } catch {
        toast.error(t('labOrders.toast.statusUpdateFailed'));
      }
    },
    [statusMutation, t],
  );

  const columns: ColumnDef<LabOrder>[] = [
    {
      id: 'orderNumber',
      accessorKey: 'orderNumber',
      header: t('labOrders.columns.orderNumber'),
      cell: (_v: unknown, row: LabOrder) => (
        <button
          type="button"
          className="font-mono text-sm text-primary underline-offset-4 hover:underline cursor-pointer"
          onClick={() => navigate(`/lab-orders/${row._id}`)}
        >
          {row.orderNumber}
        </button>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: t('labOrders.columns.description'),
      cell: (_v: unknown, row: LabOrder) => (
        <div className="max-w-[200px]">
          <span className="text-sm font-medium">{row.description || '—'}</span>
          {(row.toothNumbers?.length ?? 0) > 0 && (
            <div className="text-muted-foreground text-xs">
              {t('labOrders.cell.teeth')} {row.toothNumbers?.join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'material',
      accessorKey: 'material',
      header: t('labOrders.columns.materialShade'),
      cell: (_v: unknown, row: LabOrder) => (
        <div className="text-sm">
          <div>{row.material || '—'}</div>
          {row.shade && (
            <div className="text-muted-foreground text-xs">
              {t('labOrders.cell.shade')} {row.shade}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('labOrders.columns.status'),
      cell: (_v: unknown, row: LabOrder) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {t(`labOrders.status.${row.status}`, {
            defaultValue: STATUS_LABELS[row.status] ?? row.status,
          })}
        </Badge>
      ),
    },
    {
      id: 'expectedDeliveryDate',
      accessorKey: 'expectedDeliveryDate',
      header: t('labOrders.columns.expected'),
      cell: (_v: unknown, row: LabOrder) => {
        if (!row.expectedDeliveryDate) return <span className="text-muted-foreground">—</span>;
        const date = new Date(row.expectedDeliveryDate);
        const isOverdue = date < new Date() && !['delivered', 'cancelled'].includes(row.status);
        return (
          <span className={isOverdue ? 'font-medium text-red-500' : 'text-sm'}>
            {formatDate(row.expectedDeliveryDate)}
            {isOverdue && ` ${t('labOrders.cell.overdue')}`}
          </span>
        );
      },
    },
    {
      id: 'cost',
      accessorKey: 'cost',
      header: t('labOrders.columns.cost'),
      cell: (_v: unknown, row: LabOrder) => (
        <div className="text-sm">
          {row.cost != null ? formatCurrency(row.cost) : '—'}
          {row.isPaid && (
            <Badge variant="secondary" className="ms-1 text-xs">
              {t('labOrders.cell.paid')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'orderDate',
      accessorKey: 'orderDate',
      header: t('labOrders.columns.ordered'),
      cell: (_v: unknown, row: LabOrder) => formatDate(row.orderDate),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, order: LabOrder) => {
        const nextStatuses = NEXT_STATUS[order.status] ?? [];
        if (nextStatuses.length === 0) return null;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {nextStatuses.map((ns) => (
                <DropdownMenuItem
                  key={ns.status}
                  onClick={() => handleStatusChange(order._id, ns.status)}
                  className={
                    ns.status === 'cancelled' || ns.status === 'rejected' ? 'text-destructive' : ''
                  }
                >
                  <ns.icon className="me-2 h-4 w-4" />
                  {t(
                    `labOrders.actions.${
                      ns.status === 'sent'
                        ? 'sendToLab'
                        : ns.status === 'in_progress'
                          ? 'markInProgress'
                          : ns.status === 'ready'
                            ? 'markReady'
                            : ns.status === 'delivered'
                              ? 'markDelivered'
                              : ns.status === 'cancelled'
                                ? 'cancel'
                                : ns.status === 'rejected'
                                  ? 'reject'
                                  : 'reopenAsDraft'
                    }`,
                    { defaultValue: ns.label },
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('labOrders.page.title')} description={t('labOrders.page.description')}>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('labOrders.actions.newLabOrder')}
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      {!patientId && stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-sm">{t('labOrders.stats.total')}</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-sm">{t('labOrders.stats.inProgress')}</p>
              <p className="text-2xl font-bold">
                {(stats.byStatus?.sent ?? 0) + (stats.byStatus?.in_progress ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-sm">{t('labOrders.stats.ready')}</p>
              <p className="text-2xl font-bold">{stats.byStatus?.ready ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                {t('labOrders.stats.overdue')}
              </p>
              <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('labOrders.search.placeholder')}
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('common.actions.filter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('labOrders.filters.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('labOrders.status.draft')}</SelectItem>
            <SelectItem value="sent">{t('labOrders.status.sent')}</SelectItem>
            <SelectItem value="in_progress">{t('labOrders.status.inProgress')}</SelectItem>
            <SelectItem value="ready">{t('labOrders.status.ready')}</SelectItem>
            <SelectItem value="delivered">{t('labOrders.status.delivered')}</SelectItem>
            <SelectItem value="rejected">{t('labOrders.status.rejected')}</SelectItem>
            <SelectItem value="cancelled">{t('labOrders.status.cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('labOrders.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<FlaskConical className="h-6 w-6" />}
          title={t('labOrders.empty.title')}
          description={t('labOrders.empty.description')}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      <LabOrderCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultPatientId={patientId}
      />
    </div>
  );
}
