/**
 * StockCountListPage — Data table for stock counts.
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
import { Plus, Search, ClipboardList } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  useStockCountList,
  type StockCount,
  type StockCountFilters,
} from '../hooks/useStockCounts.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

const STATUS_COLORS: Record<string, string> = {
  draft: 'outline',
  in_progress: 'default',
  completed: 'success',
  approved: 'success',
  cancelled: 'destructive',
};

export default function StockCountListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StockCountFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, error, refetch } = useStockCountList({
    ...filters,
    search: search || undefined,
  });

  const columns: ColumnDef<StockCount>[] = [
    {
      id: 'countNumber',
      header: t('inventory.countList.columns.countNumber'),
      accessorKey: 'countNumber',
    },
    {
      id: 'branch',
      header: t('inventory.countList.columns.branch'),
      cell: (_value, row) => {
        const b = row.branchId;
        return typeof b === 'object' && b ? b.name.en : '—';
      },
    },
    {
      id: 'type',
      header: t('inventory.countList.columns.type'),
      cell: (_value, row) => <Badge variant="outline">{row.type}</Badge>,
    },
    {
      id: 'status',
      header: t('inventory.countList.columns.status'),
      cell: (_value, row) => (
        <Badge variant={(STATUS_COLORS[row.status] || 'outline') as any}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      id: 'totalItems',
      header: t('inventory.countList.columns.items'),
      accessorKey: 'totalItems',
    },
    {
      id: 'discrepancies',
      header: t('inventory.countList.columns.discrepancies'),
      cell: (_value, row) => (
        <span className={row.discrepancies > 0 ? 'text-destructive font-medium' : ''}>
          {row.discrepancies}
        </span>
      ),
    },
    {
      id: 'date',
      header: t('inventory.countList.columns.date'),
      cell: (_value, row) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.countList.page.title')}
        description={t('inventory.countList.page.description')}
      >
        <Button onClick={() => navigate('/inventory/stock-count/new')} className="gap-2">
          <Plus className="h-4 w-4" /> {t('inventory.countList.actions.newCount')}
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('inventory.countList.search.placeholder')}
            aria-label="Search stock counts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8"
          />
        </div>
        <Select
          value={filters.type || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, type: v === 'all' ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.countList.typeFilters.allTypes')}</SelectItem>
            <SelectItem value="full">{t('inventory.countList.typeFilters.full')}</SelectItem>
            <SelectItem value="partial">{t('inventory.countList.typeFilters.partial')}</SelectItem>
            <SelectItem value="cycle">{t('inventory.countList.typeFilters.cycle')}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'all' ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.countList.statusFilters.all')}</SelectItem>
            <SelectItem value="draft">{t('inventory.countList.statusFilters.draft')}</SelectItem>
            <SelectItem value="in_progress">
              {t('inventory.countList.statusFilters.inProgress')}
            </SelectItem>
            <SelectItem value="completed">
              {t('inventory.countList.statusFilters.completed')}
            </SelectItem>
            <SelectItem value="approved">
              {t('inventory.countList.statusFilters.approved')}
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
          icon={<ClipboardList className="h-7 w-7" />}
          title={t('inventory.countList.empty.title')}
          description={t('inventory.countList.empty.description')}
          action={{
            label: t('inventory.countList.actions.startCount'),
            onClick: () => navigate('/inventory/stock-count/new'),
          }}
        />
      ) : (
        <DataTable columns={columns} data={data.items} />
      )}
    </div>
  );
}
