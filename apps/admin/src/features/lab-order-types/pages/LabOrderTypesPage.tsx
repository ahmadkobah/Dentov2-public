import { useState, useMemo } from 'react';
import {
  Button,
  Badge,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DataTable,
  EmptyState,
  PageHeader,
  type ColumnDef,
} from '@dento/ui';
import { Plus, Search, ListTree, Edit2, Trash2 } from 'lucide-react';
import { useLabOrderTypes, useDeleteLabOrderType } from '../hooks/useLabOrderTypes.js';
import type { LabOrderType } from '../hooks/useLabOrderTypes.js';
import LabOrderTypeDialog from '../components/LabOrderTypeDialog.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '../../../stores/locale.store.js';

const CATEGORIES = [
  'crown_bridge',
  'veneers',
  'removable',
  'appliances',
  'orthodontics',
  'implants',
  'diagnostics',
  'other',
] as const;

const CATEGORY_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  crown_bridge: 'default',
  veneers: 'outline',
  removable: 'secondary',
  appliances: 'secondary',
  orthodontics: 'default',
  implants: 'default',
  diagnostics: 'outline',
  other: 'outline',
};

/** Map legacy display-name categories (from old seed data) to new slug keys */
const LEGACY_CATEGORY_MAP: Record<string, string> = {
  'Crown & Bridge': 'crown_bridge',
  Veneers: 'veneers',
  Removable: 'removable',
  Appliances: 'appliances',
  Orthodontics: 'orthodontics',
  Implants: 'implants',
  Diagnostics: 'diagnostics',
};

function normCategory(raw: string): string {
  return LEGACY_CATEGORY_MAP[raw] ?? raw;
}

export default function LabOrderTypesPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LabOrderType | null>(null);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      sortBy: 'sortOrder' as const,
      sortOrder: 'asc' as const,
      limit: 100,
    }),
    [search, categoryFilter],
  );

  const { data, isLoading, isError, error, refetch } = useLabOrderTypes(filters);
  const deleteMutation = useDeleteLabOrderType();
  const items = data?.items ?? [];

  const columns: ColumnDef<LabOrderType>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('labOrderTypes.columns.name'),
      cell: (_v: unknown, row: LabOrderType) => {
        const name = row.name;
        const en = typeof name === 'string' ? name : name?.en;
        const ar = typeof name === 'string' ? undefined : name?.ar;
        return (
          <div>
            <span className="font-medium">{en}</span>
            {ar && (
              <span className="text-muted-foreground ms-2 text-sm" dir="rtl">
                {ar}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: t('labOrderTypes.columns.category'),
      cell: (_v: unknown, row: LabOrderType) => {
        const slug = normCategory(row.category);
        return (
          <Badge variant={CATEGORY_COLORS[slug] ?? 'outline'} className="capitalize">
            {t(`labOrderTypes.category.${slug}`)}
          </Badge>
        );
      },
    },
    {
      id: 'turnaround',
      accessorKey: 'defaultTurnaroundDays',
      header: t('labOrderTypes.columns.turnaround'),
      cell: (_v: unknown, row: LabOrderType) => (
        <span className="text-sm">{row.defaultTurnaroundDays}d</span>
      ),
    },
    {
      id: 'type',
      accessorKey: 'isCustom',
      header: t('labOrderTypes.columns.type'),
      cell: (_v: unknown, row: LabOrderType) => (
        <Badge variant={row.isCustom ? 'outline' : 'secondary'}>
          {row.isCustom ? t('labOrderTypes.badge.custom') : t('labOrderTypes.badge.default')}
        </Badge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'isActive',
      header: t('labOrderTypes.columns.status'),
      cell: (_v: unknown, row: LabOrderType) => (
        <Badge variant={row.isActive ? 'default' : 'destructive'}>
          {row.isActive ? t('labOrderTypes.status.active') : t('labOrderTypes.status.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: LabOrderType) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingItem(row);
              setDialogOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          {row.isActive && (
            <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(row._id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('labOrderTypes.page.title')}
        description={t('labOrderTypes.page.description')}
      >
        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="me-2 h-4 w-4" />
          {t('labOrderTypes.actions.add')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('labOrderTypes.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('common.actions.filter')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('labOrderTypes.filters.allCategories')}</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {t(`labOrderTypes.category.${cat}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('labOrderTypes.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<ListTree className="h-6 w-6" />}
          title={t('labOrderTypes.empty.title')}
          description={t('labOrderTypes.empty.description')}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      <LabOrderTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} editItem={editingItem} />
    </div>
  );
}
