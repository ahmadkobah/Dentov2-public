/**
 * Payment List Page — per DENTO_V2_MASTER_PLAN.md §13 (Module #13 Payments).
 * DataTable for payments with status/method filters and reconciliation tab.
 */

import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  usePaymentList,
  useRefundPayment,
  type TenantPayment,
  type PaymentFilters,
} from '../hooks/usePayments.js';
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { CreditCard, Search, MoreHorizontal, RotateCcw, Eye, Plus } from 'lucide-react';
import PaymentReceipt from '../components/PaymentReceipt.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Status & Method badge maps ─────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  completed: 'default',
  failed: 'destructive',
  refunded: 'secondary',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  insurance: 'Insurance',
  online: 'Online',
  fawry: 'Fawry',
  meeza: 'Meeza',
};

// ── Helpers ────────────────────────────────────────────────

function patientName(p: TenantPayment): string {
  if (typeof p.patientId === 'object' && p.patientId) {
    const pt = p.patientId;
    return `${pt.firstName?.en ?? ''} ${pt.lastName?.en ?? ''}`.trim() || pt.patientCode;
  }
  return String(p.patientId);
}

function invoiceRef(p: TenantPayment): string {
  if (typeof p.invoiceId === 'object' && p.invoiceId) {
    return p.invoiceId.invoiceNumber;
  }
  return String(p.invoiceId);
}

// ── Component ──────────────────────────────────────────────

export default function PaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<PaymentFilters>({
    page: 1,
    limit: 20,
    sortBy: 'receivedAt',
    sortOrder: 'desc',
    invoiceId: searchParams.get('invoiceId') || undefined,
  });
  const [search, setSearch] = useState('');
  const [refundTarget, setRefundTarget] = useState<TenantPayment | null>(null);

  const { data, isLoading, isError, error, refetch } = usePaymentList({
    ...filters,
    search: search || undefined,
  });

  const refundMutation = useRefundPayment();
  const items = data?.items ?? [];

  // ── Summary cards computation ──────────────────────────

  const summaryCards = items.reduce(
    (acc, p) => {
      acc.transactions += 1;
      if (p.status === 'completed') acc.collected += p.amount;
      if (p.status === 'refunded') acc.refunded += p.amount;
      acc.totalBilled += p.amount;
      return acc;
    },
    { totalBilled: 0, collected: 0, refunded: 0, transactions: 0 },
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleRefund = useCallback(async () => {
    if (!refundTarget) return;
    try {
      await refundMutation.mutateAsync({
        id: refundTarget._id,
        reason: 'Refund requested',
      });
      toast.success(t('payments.toast.refunded'));
    } catch {
      toast.error(t('payments.toast.refundFailed'));
    } finally {
      setRefundTarget(null);
    }
  }, [refundTarget, refundMutation]);

  // ── Column Definitions ─────────────────────────────────

  const columns: ColumnDef<TenantPayment>[] = [
    {
      id: 'invoiceId',
      accessorKey: 'invoiceId',
      header: t('payments.col.invoice'),
      cell: (_v: unknown, row: TenantPayment) => (
        <span className="font-mono text-sm">{invoiceRef(row)}</span>
      ),
    },
    {
      id: 'patient',
      accessorKey: 'patientId',
      header: t('payments.col.patient'),
      cell: (_v: unknown, row: TenantPayment) => (
        <span className="text-sm">{patientName(row)}</span>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: t('payments.col.amount'),
      cell: (_v: unknown, row: TenantPayment) => (
        <span className="font-medium text-sm">{formatCurrency(row.amount, row.currency)}</span>
      ),
    },
    {
      id: 'method',
      accessorKey: 'paymentMethod',
      header: t('payments.col.method'),
      cell: (_v: unknown, row: TenantPayment) => (
        <Badge variant="outline">{METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('payments.col.status'),
      cell: (_v: unknown, row: TenantPayment) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'reference',
      accessorKey: 'paymentReference',
      header: t('payments.col.reference'),
      cell: (_v: unknown, row: TenantPayment) => (
        <span className="text-muted-foreground text-sm">{row.paymentReference || '—'}</span>
      ),
    },
    {
      id: 'receivedAt',
      accessorKey: 'receivedAt',
      header: t('payments.col.date'),
      cell: (_v: unknown, row: TenantPayment) => formatDate(row.receivedAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, pay: TenantPayment) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/payments/${pay._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('payments.action.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <div>
                <PaymentReceipt payment={pay} />
              </div>
            </DropdownMenuItem>
            {pay.status === 'completed' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setRefundTarget(pay)} className="text-destructive">
                  <RotateCcw className="me-2 h-4 w-4" />
                  {t('payments.action.refund')}
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
      <PageHeader title={t('payments.title')} description={t('payments.subtitle')}>
        <Button onClick={() => navigate('/payments/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('payments.recordPayment')}
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t('payments.summary.totalBilled')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summaryCards.totalBilled)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t('payments.summary.collected')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summaryCards.collected)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t('payments.summary.refunded')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive text-2xl font-bold">
                {formatCurrency(summaryCards.refunded)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {t('payments.summary.transactions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summaryCards.transactions}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by reference, patient..."
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentMethod || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              paymentMethod: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="fawry">Fawry</SelectItem>
            <SelectItem value="meeza">Meeza</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState title="Failed to load payments" message={error?.message} onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="No payments found"
          description="Record a payment to get started."
          action={{ label: 'Record Payment', onClick: () => navigate('/payments/new') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Refund Confirmation */}
      <ConfirmDialog
        open={!!refundTarget}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Refund payment?"
        description={`Refund ${refundTarget ? formatCurrency(refundTarget.amount, refundTarget.currency) : ''} to the patient. This will update the invoice balance.`}
        confirmLabel="Refund"
        variant="destructive"
        onConfirm={handleRefund}
      />
    </div>
  );
}
