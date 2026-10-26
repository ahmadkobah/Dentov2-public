import { useState } from 'react';
import {
  PageHeader,
  StatCard,
  DataTable,
  Input,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@dento/ui';
import type { ColumnDef, SortDirection } from '@dento/ui';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  Plus,
  FileCheck,
  XCircle,
  Trash2,
} from 'lucide-react';
import type { SaaSInvoice, SaaSInvoiceStatus } from '@dento/shared';
import {
  useBillingStats,
  useSaaSInvoices,
  useIssueInvoice,
  useCancelInvoice,
  useDeleteInvoice,
} from '../hooks/useBilling.js';
import type { SaaSInvoiceFilters } from '../hooks/useBilling.js';
import { RevenueChart } from '../components/RevenueChart.js';
import { InvoiceDetailDialog } from '../components/InvoiceDetailSheet.js';
import { CreateInvoiceDialog } from '../components/CreateInvoiceDialog.js';
import { QueryErrorBanner } from '../../../components/QueryErrorBanner.js';
import { EmptyState } from '../../../components/EmptyState.js';
import { formatDateShort as formatDate } from '../../../lib/date.js';
import { formatCurrency } from '../../../lib/currency.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const invoiceStatusVariant: Record<
  SaaSInvoiceStatus,
  'default' | 'secondary' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'destructive',
};

type StatusFilter = 'all' | SaaSInvoiceStatus;

const STATUS_OPTIONS: StatusFilter[] = [
  'all',
  'draft',
  'issued',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
  'refunded',
];

/* ------------------------------------------------------------------ */
/*  Invoice Table Columns                                              */
/* ------------------------------------------------------------------ */

const invoiceColumns: ColumnDef<SaaSInvoice>[] = [
  {
    id: 'invoiceNumber',
    header: 'Invoice #',
    accessorKey: 'invoiceNumber',
    sortable: true,
    cell: (v) => <span className="font-mono text-xs">{String(v)}</span>,
  },
  {
    id: 'tenant',
    header: 'Tenant',
    accessorKey: 'tenantName',
    sortable: true,
  },
  {
    id: 'source',
    header: 'Source',
    accessorKey: 'source',
    cell: (v) => <span className="capitalize">{String(v)}</span>,
  },
  {
    id: 'total',
    header: 'Total',
    accessorKey: 'total',
    sortable: true,
    cell: (v, row) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency }).format(
        v as number,
      ),
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: (v) => (
      <Badge variant={invoiceStatusVariant[v as SaaSInvoiceStatus]} className="capitalize">
        {String(v).replace('_', ' ')}
      </Badge>
    ),
  },
  {
    id: 'dueDate',
    header: 'Due Date',
    accessorKey: 'dueDate',
    sortable: true,
    cell: (v) => formatDate(v as string),
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="SaaS revenue tracking and invoice management." />

      {/* Tab Navigation */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab() {
  const { data: stats, isLoading, isError, refetch } = useBillingStats();

  return (
    <div className="space-y-6">
      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Empty State */}
      {!isLoading && !isError && !stats && (
        <EmptyState
          icon={CreditCard}
          title="No billing data"
          description="Billing information will appear once tenants subscribe."
        />
      )}

      {/* Stats */}
      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="MRR"
              value={formatCurrency(stats.mrr)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <StatCard
              title="ARR"
              value={formatCurrency(stats.arr)}
              icon={<TrendingUp className="h-5 w-5" />}
              variant="success"
            />
            <StatCard
              title="Outstanding"
              value={formatCurrency(stats.outstandingAmount)}
              icon={<CreditCard className="h-5 w-5" />}
              variant="warning"
            />
            <StatCard
              title="Overdue Invoices"
              value={stats.overdueInvoices}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant="error"
            />
          </div>

          {/* Revenue Chart */}
          <RevenueChart timeline={stats.revenueTimeline} />

          {/* Revenue by Plan */}
          {stats.revenueByPlan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.revenueByPlan.map((plan) => (
                    <div
                      key={plan.plan}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium capitalize">{plan.plan}</p>
                        <p className="text-xs text-gray-500">{plan.count} subscriptions</p>
                      </div>
                      <p className="text-lg font-semibold">{formatCurrency(plan.revenue)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Invoices Tab                                                       */
/* ------------------------------------------------------------------ */

function InvoicesTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filters: SaaSInvoiceFilters = {
    ...(search && { search }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    page,
    limit: 20,
  };

  const { data, isLoading, isError, refetch } = useSaaSInvoices(filters);
  const issueInvoice = useIssueInvoice();
  const cancelInvoice = useCancelInvoice();
  const deleteInvoice = useDeleteInvoice();

  const actionColumn: ColumnDef<SaaSInvoice> = {
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
        {row.status === 'draft' && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-green-600"
              disabled={issueInvoice.isPending}
              onClick={(e) => {
                e.stopPropagation();
                issueInvoice.mutate(row._id);
              }}
            >
              <FileCheck className="me-1 h-3.5 w-3.5" />
              Issue
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={deleteInvoice.isPending}
              onClick={(e) => {
                e.stopPropagation();
                deleteInvoice.mutate(row._id);
              }}
            >
              <Trash2 className="me-1 h-3.5 w-3.5" />
            </Button>
          </>
        )}
        {(row.status === 'issued' ||
          row.status === 'overdue' ||
          row.status === 'partially_paid') && (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-600"
            disabled={cancelInvoice.isPending}
            onClick={(e) => {
              e.stopPropagation();
              cancelInvoice.mutate({ id: row._id, reason: 'Cancelled from billing page' });
            }}
          >
            <XCircle className="me-1 h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    ),
  };

  return (
    <div className="space-y-4">
      {isError && <QueryErrorBanner onRetry={() => refetch()} />}

      {/* Filters + Create Button */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by tenant or invoice #…"
          aria-label="Search invoices"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-52"
        />

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt === 'all'
                  ? 'All Statuses'
                  : opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ms-auto">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-1 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable<SaaSInvoice>
        columns={[...invoiceColumns, actionColumn]}
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
        emptyMessage="No invoices found."
      />

      {/* Detail Dialog */}
      <InvoiceDetailDialog invoiceId={selectedId} onClose={() => setSelectedId(null)} />

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
