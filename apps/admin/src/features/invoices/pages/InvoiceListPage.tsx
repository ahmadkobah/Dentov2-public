/**
 * Invoice List Page — per DENTO_V2_MASTER_PLAN.md §12 (Module #12 Billing & Invoicing).
 * DataTable with server-side pagination, search, status & date-range filters.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useInvoiceList,
  useInvoiceStats,
  useIssueInvoice,
  useCancelInvoice,
  type Invoice,
  type InvoiceFilters,
} from '../hooks/useInvoices.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { formatDate } from '@/lib/date.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
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
  Card,
  CardContent,
} from '@dento/ui';
import {
  Receipt,
  Search,
  MoreHorizontal,
  SendHorizontal,
  XCircle,
  Eye,
  Plus,
  CreditCard,
  Download,
  Calendar,
  Pencil,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Helpers ────────────────────────────────────────────────

function patientName(inv: Invoice): string {
  if (typeof inv.patientId === 'object' && inv.patientId) {
    const p = inv.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(inv.patientId);
}

// ── Component ──────────────────────────────────────────────

export interface InvoiceListPageProps {
  patientId?: string;
}

export default function InvoiceListPage({ patientId }: InvoiceListPageProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<InvoiceFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...(patientId ? { patientId } : {}),
  });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Invoice | null>(null);

  const { data, isLoading, isError, error, refetch } = useInvoiceList({
    ...filters,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: stats } = useInvoiceStats();

  const issueMutation = useIssueInvoice();
  const cancelMutation = useCancelInvoice();

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  // Doctor list for filter
  const { data: doctorData } = useDoctorList({ limit: 100, isActive: true });

  // ── Export ─────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const header = [
      'Invoice #',
      'Patient',
      'Total',
      'Paid',
      'Balance Due',
      'Status',
      'Due Date',
      'Created',
    ];
    const rows = items.map((inv) => [
      inv.invoiceNumber,
      patientName(inv),
      inv.totalAmount.toFixed(2),
      inv.amountPaid.toFixed(2),
      inv.balanceDue.toFixed(2),
      inv.status,
      inv.dueDate ? formatDate(inv.dueDate) : '',
      formatDate(inv.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  // ── Handlers ───────────────────────────────────────────

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleIssue = useCallback(
    async (id: string) => {
      try {
        await issueMutation.mutateAsync(id);
        toast.success(t('invoices.list.toast.issued'));
      } catch {
        toast.error(t('invoices.list.toast.issueFailed'));
      }
    },
    [issueMutation],
  );

  const handleCancel = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync(cancelTarget._id);
      toast.success('Invoice cancelled');
    } catch {
      toast.error('Failed to cancel invoice');
    } finally {
      setCancelTarget(null);
    }
  }, [cancelTarget, cancelMutation]);

  // ── Column Definitions ─────────────────────────────────

  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'invoiceNumber',
      accessorKey: 'invoiceNumber',
      header: t('invoices.list.columns.invoiceNumber'),
      cell: (_v: unknown, row: Invoice) => (
        <span className="font-mono text-sm">{row.invoiceNumber}</span>
      ),
    },
    {
      id: 'patient',
      accessorKey: 'patientId',
      header: t('invoices.list.columns.patient'),
      cell: (_v: unknown, row: Invoice) => <span className="text-sm">{patientName(row)}</span>,
    },
    {
      id: 'totalAmount',
      accessorKey: 'totalAmount',
      header: t('invoices.list.columns.total'),
      cell: (_v: unknown, row: Invoice) => (
        <span className="font-medium text-sm">{formatCurrency(row.totalAmount, row.currency)}</span>
      ),
    },
    {
      id: 'balanceDue',
      accessorKey: 'balanceDue',
      header: t('invoices.list.columns.balanceDue'),
      cell: (_v: unknown, row: Invoice) => (
        <span
          className={`text-sm ${row.balanceDue > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {formatCurrency(row.balanceDue, row.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('invoices.list.columns.status'),
      cell: (_v: unknown, row: Invoice) => <InvoiceStatusBadge status={row.status} compact />,
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: t('invoices.list.columns.dueDate'),
      cell: (_v: unknown, row: Invoice) => (row.dueDate ? formatDate(row.dueDate) : '—'),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('invoices.list.columns.created'),
      cell: (_v: unknown, row: Invoice) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, inv: Invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/invoices/${inv._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('invoices.list.actions.viewDetails')}
            </DropdownMenuItem>
            {inv.status === 'draft' && (
              <DropdownMenuItem onClick={() => navigate(`/invoices/${inv._id}/edit`)}>
                <Pencil className="me-2 h-4 w-4" />
                {t('invoices.list.actions.edit')}
              </DropdownMenuItem>
            )}
            {inv.status === 'draft' && (
              <DropdownMenuItem onClick={() => handleIssue(inv._id)}>
                <SendHorizontal className="me-2 h-4 w-4" />
                {t('invoices.list.actions.issueInvoice')}
              </DropdownMenuItem>
            )}
            {(inv.status === 'issued' || inv.status === 'partially_paid') && (
              <DropdownMenuItem onClick={() => navigate(`/payments/new?invoiceId=${inv._id}`)}>
                <CreditCard className="me-2 h-4 w-4" />
                {t('invoices.list.actions.recordPayment')}
              </DropdownMenuItem>
            )}
            {(inv.status === 'draft' || inv.status === 'issued') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCancelTarget(inv)} className="text-destructive">
                  <XCircle className="me-2 h-4 w-4" />
                  {t('invoices.list.actions.cancel')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('invoices.list.page.title')}
        description={t('invoices.list.page.description')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="me-2 h-4 w-4" />
            {t('invoices.list.actions.exportCsv')}
          </Button>
          <Button onClick={() => navigate('/invoices/new')}>
            <Plus className="me-2 h-4 w-4" />
            {t('invoices.list.actions.newInvoice')}
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t('invoices.list.stats.totalRevenue')}
                </p>
                <p className="text-lg font-semibold">
                  {formatCurrency(stats.overall.totalRevenue)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {stats.overall.totalInvoices} {t('invoices.list.stats.invoices')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t('invoices.list.stats.collected')}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(stats.overall.totalCollected)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t('invoices.list.stats.outstanding')}
                </p>
                <p className="text-destructive text-lg font-semibold">
                  {formatCurrency(stats.overall.totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {t('invoices.list.stats.last30Days')}
                </p>
                <p className="text-lg font-semibold">{formatCurrency(stats.recentMonth.amount)}</p>
                <p className="text-muted-foreground text-xs">
                  {stats.recentMonth.count} {t('invoices.list.stats.invoices')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('invoices.list.search.placeholder')}
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
            <SelectItem value="all">{t('invoices.list.filters.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('invoices.list.filters.draft')}</SelectItem>
            <SelectItem value="issued">{t('invoices.list.filters.issued')}</SelectItem>
            <SelectItem value="installment">{t('invoices.list.filters.installment')}</SelectItem>
            <SelectItem value="paid">{t('invoices.list.filters.paid')}</SelectItem>
            <SelectItem value="partially_paid">
              {t('invoices.list.filters.partiallyPaid')}
            </SelectItem>
            <SelectItem value="overdue">{t('invoices.list.filters.overdue')}</SelectItem>
            <SelectItem value="cancelled">{t('invoices.list.filters.cancelled')}</SelectItem>
            <SelectItem value="refunded">{t('invoices.list.filters.refunded')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.doctorId || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              doctorId: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('invoices.list.doctorFilter.doctor')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('invoices.list.doctorFilter.allDoctors')}</SelectItem>
            {(doctorData?.items ?? []).map((doc) => (
              <SelectItem key={doc._id} value={doc._id}>
                {doc.firstName} {doc.lastName}
              </SelectItem>
            ))}
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
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setFilters((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-[150px]"
            placeholder="To"
          />
        </div>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('invoices.list.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<Receipt className="h-6 w-6" />}
          title={t('invoices.list.empty.title')}
          description={t('invoices.list.empty.description')}
          action={{
            label: t('invoices.list.actions.newInvoice'),
            onClick: () => navigate('/invoices/new'),
          }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t('invoices.list.confirm.cancelTitle')}
        description={`Invoice "${cancelTarget?.invoiceNumber}" will be cancelled. This action cannot be undone.`}
        confirmLabel={t('invoices.list.confirm.cancelLabel')}
        variant="destructive"
        onConfirm={handleCancel}
      />
    </div>
  );
}
