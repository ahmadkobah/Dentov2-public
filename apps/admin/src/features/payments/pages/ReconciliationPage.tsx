/**
 * Reconciliation Page — per DENTO_V2_MASTER_PLAN.md §13 / V2_DATABASE.md §Reconciliation.
 * Daily branch reconciliation view with open / close / review workflow.
 */

import { useState, useCallback } from 'react';
import {
  useReconciliationList,
  useOpenReconciliation,
  useUpdateReconciliation,
  type Reconciliation,
  type ReconciliationFilters,
} from '../hooks/usePayments.js';
import { formatDate } from '@/lib/date.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { BranchCombobox } from '@/components/entity-selectors/BranchCombobox.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Badge,
  toast,
  type ColumnDef,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';
import { MoreHorizontal, Lock, CheckCircle, BookOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open: 'outline',
  closed: 'default',
  reviewed: 'secondary',
};

export default function ReconciliationPage() {
  const { t } = useTranslation();
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [filters] = useState<ReconciliationFilters>({
    page: 1,
    limit: 20,
  });

  const { data, isLoading, isError, error, refetch } = useReconciliationList(filters);
  const openMutation = useOpenReconciliation();
  const updateMutation = useUpdateReconciliation();

  const items = data?.items ?? [];

  const handleOpen = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await openMutation.mutateAsync({
        branchId: selectedBranchId,
        reconciliationDate: today,
        openingBalance: 0,
      });
      toast.success(t('payments.reconciliation.toast.opened'));
    } catch {
      toast.error(t('payments.reconciliation.toast.openFailed'));
    }
  }, [openMutation]);

  const handleClose = useCallback(
    async (id: string) => {
      try {
        await updateMutation.mutateAsync({ id, data: { status: 'closed' } });
        toast.success(t('payments.reconciliation.toast.closed'));
      } catch {
        toast.error(t('payments.reconciliation.toast.closeFailed'));
      }
    },
    [updateMutation],
  );

  const handleReview = useCallback(
    async (id: string) => {
      try {
        await updateMutation.mutateAsync({ id, data: { status: 'reviewed' } });
        toast.success(t('payments.reconciliation.toast.reviewed'));
      } catch {
        toast.error(t('payments.reconciliation.toast.reviewFailed'));
      }
    },
    [updateMutation],
  );

  const columns: ColumnDef<Reconciliation>[] = [
    {
      id: 'date',
      accessorKey: 'reconciliationDate',
      header: t('payments.reconciliation.col.date'),
      cell: (_v: unknown, row: Reconciliation) => formatDate(row.reconciliationDate),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('payments.reconciliation.col.status'),
      cell: (_v: unknown, row: Reconciliation) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'totalCash',
      accessorKey: 'totalCash',
      header: t('payments.reconciliation.col.cash'),
      cell: (_v: unknown, row: Reconciliation) => (
        <span className="text-sm">{formatCurrency(row.totalCash)}</span>
      ),
    },
    {
      id: 'totalCard',
      accessorKey: 'totalCard',
      header: t('payments.reconciliation.col.card'),
      cell: (_v: unknown, row: Reconciliation) => (
        <span className="text-sm">{formatCurrency(row.totalCard)}</span>
      ),
    },
    {
      id: 'totalOnline',
      accessorKey: 'totalOnline',
      header: t('payments.reconciliation.col.online'),
      cell: (_v: unknown, row: Reconciliation) => (
        <span className="text-sm">{formatCurrency(row.totalOnline)}</span>
      ),
    },
    {
      id: 'expectedTotal',
      accessorKey: 'expectedTotal',
      header: t('payments.reconciliation.col.expected'),
      cell: (_v: unknown, row: Reconciliation) => (
        <span className="font-medium text-sm">{formatCurrency(row.expectedTotal)}</span>
      ),
    },
    {
      id: 'discrepancy',
      accessorKey: 'discrepancy',
      header: t('payments.reconciliation.col.discrepancy'),
      cell: (_v: unknown, row: Reconciliation) => (
        <span
          className={`text-sm font-medium ${row.discrepancy !== 0 ? 'text-destructive' : 'text-muted-foreground'}`}
        >
          {formatCurrency(row.discrepancy)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, rec: Reconciliation) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {rec.status === 'open' && (
              <DropdownMenuItem onClick={() => handleClose(rec._id)}>
                <Lock className="me-2 h-4 w-4" />
                Close
              </DropdownMenuItem>
            )}
            {rec.status === 'closed' && (
              <DropdownMenuItem onClick={() => handleReview(rec._id)}>
                <CheckCircle className="me-2 h-4 w-4" />
                Mark Reviewed
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('payments.reconciliation.title')}
        description={t('payments.reconciliation.subtitle')}
      >
        <div className="flex items-center gap-3">
          <BranchCombobox value={selectedBranchId} onValueChange={setSelectedBranchId} />
          <Button onClick={handleOpen} disabled={!selectedBranchId}>
            <BookOpen className="me-2 h-4 w-4" />
            {t('payments.reconciliation.openToday')}
          </Button>
        </div>
      </PageHeader>

      {isLoading ? (
        <TableSkeleton columns={8} rows={8} />
      ) : isError ? (
        <ErrorState
          title="Failed to load reconciliations"
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title={t('payments.reconciliation.empty.title')}
          description={t('payments.reconciliation.empty.description')}
          action={{ label: 'Open Today', onClick: handleOpen }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}
    </div>
  );
}
