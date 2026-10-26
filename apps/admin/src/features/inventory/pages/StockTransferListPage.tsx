/**
 * StockTransferListPage — Data table for stock transfers.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@dento/ui';
import { Plus, Search, ArrowRightLeft } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  useStockTransferList,
  type StockTransfer,
  type TransferFilters,
} from '../hooks/useStockTransfers.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

const STATUS_COLORS: Record<string, string> = {
  draft: 'outline',
  in_transit: 'warning',
  received: 'success',
  cancelled: 'destructive',
};

export default function StockTransferListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TransferFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useStockTransferList({
    ...filters,
    search: search || undefined,
  });

  const columns: ColumnDef<StockTransfer>[] = [
    {
      id: 'transferNumber',
      header: t('inventory.transferList.columns.transferNumber'),
      accessorKey: 'transferNumber',
    },
    {
      id: 'from',
      header: t('inventory.transferList.columns.from'),
      cell: (_value, row) => {
        const b = row.fromBranchId;
        return typeof b === 'object' && b ? b.name.en : '—';
      },
    },
    {
      id: 'to',
      header: t('inventory.transferList.columns.to'),
      cell: (_value, row) => {
        const b = row.toBranchId;
        return typeof b === 'object' && b ? b.name.en : '—';
      },
    },
    {
      id: 'status',
      header: t('inventory.transferList.columns.status'),
      cell: (_value, row) => (
        <Badge variant={(STATUS_COLORS[row.status] || 'outline') as any}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: t('inventory.transferList.columns.date'),
      cell: (_value, row) => formatDate(row.createdAt),
    },
    {
      id: 'items',
      header: t('inventory.transferList.columns.items'),
      cell: (_value, row) => row.items?.length ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.transferList.page.title')}
        description={t('inventory.transferList.page.description')}
      >
        <Button onClick={() => navigate('/inventory/transfers/new')} className="gap-2">
          <Plus className="h-4 w-4" /> {t('inventory.transferList.actions.newTransfer')}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('inventory.transferList.search.placeholder')}
            aria-label="Search stock transfers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8"
          />
        </div>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.list.filters.all')}</SelectItem>
            <SelectItem value="draft">{t('inventory.transferList.status.draft')}</SelectItem>
            <SelectItem value="in_transit">
              {t('inventory.transferList.status.inTransit')}
            </SelectItem>
            <SelectItem value="received">{t('inventory.transferList.status.received')}</SelectItem>
            <SelectItem value="cancelled">
              {t('inventory.transferList.status.cancelled')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-7 w-7" />}
          title={t('inventory.transferList.empty.title')}
          description={t('inventory.transferList.empty.description')}
          action={{
            label: t('inventory.transferList.actions.createTransfer'),
            onClick: () => navigate('/inventory/transfers/new'),
          }}
        />
      ) : (
        <DataTable columns={columns} data={data.items} />
      )}
    </div>
  );
}
