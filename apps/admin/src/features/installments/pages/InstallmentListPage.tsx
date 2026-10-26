/**
 * Installment Plans Page — per DENTO_V2_MASTER_PLAN.md §12 (Module #12 Billing, installment sub-section).
 * DataTable with status filters, financials summary, payment tracking.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInstallmentList,
  type InstallmentPlan,
  type InstallmentFilters,
} from '../hooks/useInstallments.js';
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
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';
import { DollarSign, Search, MoreHorizontal, Plus, Eye, Download, Calendar } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

// ── Status ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  defaulted: 'destructive',
  cancelled: 'outline',
};

// ── Helpers ──────────────────────────────────────────────────────

function patientName(plan: InstallmentPlan): string {
  if (typeof plan.patientId === 'object' && plan.patientId) {
    const p = plan.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(plan.patientId);
}

function paidCount(plan: InstallmentPlan): number {
  return plan.payments.filter((p) => p.status === 'paid').length;
}

function nextDuePayment(plan: InstallmentPlan) {
  return plan.payments.find((p) => p.status === 'pending' || p.status === 'overdue') ?? null;
}

function paymentTimeliness(plan: InstallmentPlan): 'on-time' | 'late' | 'paid' | 'cancelled' {
  if (plan.status === 'completed') return 'paid';
  if (plan.status === 'cancelled') return 'cancelled';
  const hasOverdue = plan.payments.some((p) => p.status === 'overdue');
  if (hasOverdue) return 'late';
  const next = nextDuePayment(plan);
  if (next && new Date(next.dueDate) < new Date()) return 'late';
  return 'on-time';
}

const TIMELINESS_CONFIG: Record<
  string,
  { variant: 'default' | 'destructive' | 'secondary' | 'outline' }
> = {
  'on-time': { variant: 'default' },
  late: { variant: 'destructive' },
  paid: { variant: 'secondary' },
  cancelled: { variant: 'outline' },
};

// ── Component ──────────────────────────────────────────

export default function InstallmentListPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<InstallmentFilters>({
    page: 1,
    limit: 20,
  });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading, isError, error, refetch } = useInstallmentList({
    ...filters,
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  });

  const items = data?.items ?? [];

  // ── Summary ─────────────────────────────────────────

  const summary = items.reduce(
    (acc, p) => ({
      totalPlanned: acc.totalPlanned + p.totalAmount,
      totalRemaining: acc.totalRemaining + p.remainingAmount,
    }),
    { totalPlanned: 0, totalRemaining: 0 },
  );

  // ── Export ──────────────────────────────────────────

  const handleExport = useCallback(() => {
    const header = [
      'Plan #',
      'Patient',
      'Total',
      'Down Payment',
      'Remaining',
      'Installments',
      'Frequency',
      'Status',
      'Start Date',
    ];
    const rows = items.map((p) => [
      p.planNumber,
      patientName(p),
      (p.totalAmount ?? 0).toFixed(2),
      (p.downPayment ?? 0).toFixed(2),
      (p.remainingAmount ?? 0).toFixed(2),
      (p.numberOfInstallments ?? 0).toString(),
      p.frequency,
      p.status,
      formatDate(p.startDate),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `installment-plans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  // ── Columns ─────────────────────────────────────────

  const columns: ColumnDef<InstallmentPlan>[] = [
    {
      id: 'planNumber',
      header: t('installments.columns.planNumber'),
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span className="font-mono text-sm">#{row._id.slice(-6).toUpperCase()}</span>
      ),
    },
    {
      id: 'patient',
      accessorKey: 'patientId',
      header: t('installments.columns.patient'),
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span className="text-sm">{patientName(row)}</span>
      ),
    },
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: t('installments.columns.total'),
      className: 'text-end',
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span className="block text-end text-sm font-medium">
          {formatCurrency(row.totalAmount)}
        </span>
      ),
    },
    {
      id: 'remaining',
      accessorKey: 'remainingAmount',
      header: t('installments.columns.remaining'),
      className: 'text-end',
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span
          className={`block text-end text-sm ${row.remainingAmount > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {formatCurrency(row.remainingAmount)}
        </span>
      ),
    },
    {
      id: 'progress',
      accessorKey: 'payments',
      header: t('installments.columns.progress'),
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span className="text-sm">
          {paidCount(row)} / {row.numberOfInstallments}
        </span>
      ),
    },
    {
      id: 'nextDue',
      header: t('installments.columns.nextDue'),
      cell: (_v: unknown, row: InstallmentPlan) => {
        const next = nextDuePayment(row);
        if (!next) return <span className="text-muted-foreground text-sm">—</span>;
        const isLate = new Date(next.dueDate) < new Date();
        return (
          <span className={`text-sm ${isLate ? 'text-destructive font-medium' : ''}`}>
            {formatDate(next.dueDate)}
          </span>
        );
      },
    },
    {
      id: 'paymentStatus',
      header: t('installments.columns.paymentStatus'),
      cell: (_v: unknown, row: InstallmentPlan) => {
        const status = paymentTimeliness(row);
        const config = TIMELINESS_CONFIG[status];
        const label =
          status === 'on-time'
            ? t('installments.timeliness.onTime')
            : status === 'paid'
              ? t('installments.timeliness.fullyPaid')
              : t(`installments.timeliness.${status}`);
        return <Badge variant={config?.variant ?? 'outline'}>{label}</Badge>;
      },
    },
    {
      id: 'frequency',
      accessorKey: 'frequency',
      header: t('installments.columns.frequency'),
      cell: (_v: unknown, row: InstallmentPlan) => (
        <span className="text-sm">
          {t(`installments.frequency.${row.frequency}`) || row.frequency}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('installments.columns.status'),
      cell: (_v: unknown, row: InstallmentPlan) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'}>
          {t(`installments.status.${row.status}`) || row.status}
        </Badge>
      ),
    },
    {
      id: 'startDate',
      header: t('installments.columns.startDate'),
      cell: (_v: unknown, row: InstallmentPlan) => {
        const date = row.payments?.[0]?.dueDate ?? row.createdAt;
        return formatDate(date);
      },
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, plan: InstallmentPlan) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/installments/${plan._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('installments.actions.viewDetails')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('installments.page.title')}
        description={t('installments.page.description')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="me-2 h-4 w-4" />
            {t('installments.actions.exportCsv')}
          </Button>
          <Button onClick={() => navigate('/installments/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('installments.actions.newPlan')}
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('installments.search.placeholder')}
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
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('installments.filters.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('installments.filters.active')}</SelectItem>
            <SelectItem value="completed">{t('installments.filters.completed')}</SelectItem>
            <SelectItem value="defaulted">{t('installments.filters.defaulted')}</SelectItem>
            <SelectItem value="cancelled">{t('installments.filters.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="text-muted-foreground h-4 w-4" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-[150px]"
          />
          <span className="text-muted-foreground text-sm">{t('installments.filters.to')}</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-[150px]"
          />
        </div>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t('installments.summary.totalPlanned')}
            </span>
            <span className="text-sm font-semibold">{formatCurrency(summary.totalPlanned)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {t('installments.summary.totalRemaining')}
            </span>
            <span className="text-destructive text-sm font-semibold">
              {formatCurrency(summary.totalRemaining)}
            </span>
          </div>
        </div>
      )}

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={11} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('installments.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<DollarSign className="h-6 w-6" />}
          title={t('installments.empty.title')}
          description={t('installments.empty.description')}
          action={{
            label: t('installments.actions.newPlan'),
            onClick: () => navigate('/installments/new'),
          }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}
    </div>
  );
}
