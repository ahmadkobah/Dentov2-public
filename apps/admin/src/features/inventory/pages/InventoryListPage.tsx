/**
 * InventoryListPage — Data table for inventory items with stat cards, search, filters.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  ConfirmDialog,
  toast,
  Card,
  CardContent,
  type ColumnDef,
} from '@dento/ui';
import { Plus, Package, Search, AlertTriangle, DollarSign, Archive } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  useInventoryItemList,
  useDeleteInventoryItem,
  useInventoryCategories,
  type InventoryItem,
  type InventoryItemFilters,
} from '../hooks/useInventoryItems.js';
import { InventoryForm, transformFormToApi } from '../components/InventoryForm.js';
import { useCreateInventoryItem } from '../hooks/useInventoryItems.js';
import { LowStockBadge } from '../components/LowStockBadge.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function InventoryListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InventoryItemFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch } = useInventoryItemList({
    ...filters,
    search: search || undefined,
  });

  const createMutation = useCreateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();
  const { data: categories } = useInventoryCategories();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // ── Stat cards ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const items = data?.items || [];
    const totalItems = data?.pagination?.total ?? items.length;
    const lowStock = items.filter(
      (i) => (i.currentStock ?? 0) <= i.reorderLevel && (i.currentStock ?? 0) > 0,
    ).length;
    const outOfStock = items.filter((i) => (i.currentStock ?? 0) <= 0).length;
    const totalValue = items.reduce(
      (sum, i) => sum + (i.stockValue ?? (i.currentStock ?? 0) * i.unitCost),
      0,
    );
    return { totalItems, lowStock, outOfStock, totalValue };
  }, [data]);

  // ── Handlers ────────────────────────────────────────────────
  const handleCreateSubmit = (formData: Partial<InventoryItem>) => {
    const apiData = transformFormToApi(formData as Record<string, any>);
    createMutation.mutate(apiData as Partial<InventoryItem>, {
      onSuccess: () => {
        toast.success(t('inventory.list.toast.itemCreated'));
        setShowCreateDialog(false);
      },
      onError: (err: any) => toast.error(err?.message || t('inventory.list.toast.createFailed')),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => {
        toast.success(t('inventory.list.toast.itemDeleted'));
        setDeleteTarget(null);
      },
      onError: (err: any) => toast.error(err?.message || t('inventory.list.toast.deleteFailed')),
    });
  };

  // ── Columns ─────────────────────────────────────────────────
  const columns: ColumnDef<InventoryItem>[] = [
    {
      id: 'name',
      header: t('inventory.list.columns.item'),
      accessorFn: (r) => r.name.en,
      cell: (_value, row) => (
        <button
          className="font-medium text-primary hover:underline"
          onClick={() => navigate(`/inventory/${row._id}`)}
        >
          {row.name.en}
        </button>
      ),
    },
    { id: 'sku', header: t('inventory.list.columns.sku'), accessorKey: 'sku' },
    {
      id: 'category',
      header: t('inventory.list.columns.category'),
      cell: (_value, row) => {
        const cat = row.categoryId;
        return typeof cat === 'object' && cat ? ((cat as any).name?.en ?? '—') : '—';
      },
    },
    {
      id: 'stock',
      header: t('inventory.list.columns.stock'),
      cell: (_value, row) => (
        <LowStockBadge
          currentStock={row.currentStock ?? 0}
          reorderLevel={row.reorderLevel}
          minimumStock={row.minimumStock}
        />
      ),
    },
    {
      id: 'qty',
      header: t('inventory.list.columns.qty'),
      cell: (_value, row) => row.currentStock ?? 0,
    },
    {
      id: 'unitCost',
      header: t('inventory.list.columns.unitCost'),
      accessorKey: 'unitCost',
      cell: (_value, row) => row.unitCost.toFixed(2),
    },
    {
      id: 'value',
      header: t('inventory.list.columns.value'),
      cell: (_value, row) => ((row.currentStock ?? 0) * row.unitCost).toFixed(2),
    },
    {
      id: 'actions',
      header: '',
      cell: (_value, row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/${row._id}`)}>
            {t('inventory.list.actions.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            {t('inventory.list.actions.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('inventory.list.page.title')}
        description={t('inventory.list.page.description')}
      >
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> {t('inventory.list.actions.newItem')}
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
        role="status"
        aria-label="Inventory statistics"
      >
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
              <p className="text-xs text-muted-foreground">
                {t('inventory.list.stats.totalItems')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <AlertTriangle className="h-8 w-8 text-orange-500 dark:text-orange-400" />
            <div>
              <p className="text-2xl font-bold">{stats.lowStock}</p>
              <p className="text-xs text-muted-foreground">{t('inventory.list.stats.lowStock')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <Archive className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{stats.outOfStock}</p>
              <p className="text-xs text-muted-foreground">
                {t('inventory.list.stats.outOfStock')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4">
            <DollarSign className="h-8 w-8 text-green-500 dark:text-green-400" />
            <div>
              <p className="text-2xl font-bold">{stats.totalValue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">
                {t('inventory.list.stats.totalValue')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('inventory.list.search.placeholder')}
            aria-label="Search inventory items"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-8"
          />
        </div>
        <Select
          value={filters.categoryId || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, categoryId: v === 'all' ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('inventory.list.filters.allCategories')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.list.filters.allCategories')}</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name.en}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.stockStatus || 'all'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, stockStatus: v === 'all' ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('inventory.list.filters.stockStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('inventory.list.filters.all')}</SelectItem>
            <SelectItem value="low">{t('inventory.list.filters.lowStock')}</SelectItem>
            <SelectItem value="out">{t('inventory.list.filters.outOfStock')}</SelectItem>
            <SelectItem value="ok">{t('inventory.list.filters.inStock')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState
          icon={<Package className="h-7 w-7" />}
          title={t('inventory.list.empty.title')}
          description={t('inventory.list.empty.description')}
          action={{
            label: t('inventory.list.actions.addItem'),
            onClick: () => setShowCreateDialog(true),
          }}
        />
      ) : (
        <DataTable columns={columns} data={data.items} />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <InventoryForm
            onSubmit={handleCreateSubmit}
            isPending={createMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteTarget?.name.en}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
