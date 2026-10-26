/**
 * X-Ray List Page — per DENTO_V2_MASTER_PLAN.md §10 (#11), §17.
 * DataTable with server-side pagination, search, type/purpose filters.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/stores/locale.store.js';
import { useXrayList, useDeleteXray, type Xray, type XrayFilters } from '../hooks/useXrays.js';
import { formatDate } from '@/lib/date.js';
import { useGetDownloadUrl } from '@/features/uploads/hooks/useResolvedUrl.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Badge,
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
import {
  Plus,
  ScanLine,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  Link2,
  ExternalLink,
} from 'lucide-react';

const XRAY_TYPES = [
  'periapical',
  'bitewing',
  'panoramic',
  'cephalometric',
  'occlusal',
  'cbct',
] as const;

const PURPOSES = [
  'diagnostic',
  'pre-operative',
  'post-operative',
  'follow-up',
  'emergency',
  'routine',
] as const;

export interface XrayListPageProps {
  patientId?: string;
}

export default function XrayListPage({ patientId }: XrayListPageProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const getDownloadUrl = useGetDownloadUrl();

  const [filters, setFilters] = useState<XrayFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Xray | null>(null);

  const { data, isLoading, isError, error, refetch } = useXrayList({
    ...filters,
    search: search || undefined,
    ...(patientId ? { patientId } : {}),
  });

  const deleteMutation = useDeleteXray();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('xrays.listToast.deleted'));
    } catch {
      toast.error(t('xrays.listToast.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const columns: ColumnDef<Xray>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: t('xrays.list.columns.title'),
      cell: (_v: unknown, row: Xray) => (
        <div>
          <div className="font-medium">{row.title}</div>
          {row.fileName && <div className="text-muted-foreground text-xs">{row.fileName}</div>}
        </div>
      ),
    },
    {
      id: 'xrayType',
      accessorKey: 'xrayType',
      header: t('xrays.list.columns.type'),
      cell: (_v: unknown, row: Xray) => (
        <Badge variant="outline" className="capitalize">
          {row.xrayType}
        </Badge>
      ),
    },
    {
      id: 'toothNumbers',
      accessorKey: 'toothNumbers',
      header: t('xrays.list.columns.teeth'),
      cell: (_v: unknown, row: Xray) => {
        const teeth = row.toothNumbers;
        if (!teeth?.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {teeth.slice(0, 4).map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">
                #{t}
              </Badge>
            ))}
            {teeth.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{teeth.length - 4}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'clinicalPurpose',
      accessorKey: 'clinicalPurpose',
      header: t('xrays.list.columns.purpose'),
      cell: (_v: unknown, row: Xray) => (
        <span className="text-sm capitalize">{row.clinicalPurpose || '—'}</span>
      ),
    },
    {
      id: 'crossLinks',
      header: 'Links',
      cell: (_v: unknown, row: Xray) => {
        const linked = !!row.treatmentPlanId || !!row.procedureNoteId || !!row.dentalChartEntryId;
        return (
          <Badge variant={linked ? 'default' : 'outline'}>
            {linked ? (
              <>
                <Link2 className="me-1 h-3 w-3" />
                {t('xrays.list.linked')}
              </>
            ) : (
              t('xrays.list.unlinked')
            )}
          </Badge>
        );
      },
    },
    {
      id: 'capturedAt',
      accessorKey: 'capturedAt',
      header: t('xrays.list.columns.captured'),
      cell: (_v: unknown, row: Xray) => {
        const d = row.capturedAt || row.createdAt;
        return formatDate(d);
      },
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, xray: Xray) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/xrays/${xray._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('xrays.list.dropdownViewDetails')}
            </DropdownMenuItem>
            {xray.imageUrl && (
              <DropdownMenuItem
                onClick={async () => {
                  const url = await getDownloadUrl(xray.imageUrl);
                  window.open(url, '_blank');
                }}
              >
                <ExternalLink className="me-2 h-4 w-4" />
                {t('xrays.list.dropdownOpenImage')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteTarget(xray)} className="text-destructive">
              <Trash2 className="me-2 h-4 w-4" />
              {t('xrays.list.dropdownDelete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('xrays.list.title')} description={t('xrays.list.description')}>
        <Button onClick={() => navigate('/xrays/upload')}>
          <Plus className="me-2 h-4 w-4" />
          {t('xrays.list.uploadButton')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('xrays.list.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

        <Select
          value={filters.xrayType || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              xrayType: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('xrays.list.allTypes')}</SelectItem>
            {XRAY_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clinicalPurpose || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              clinicalPurpose: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-45">
            <SelectValue placeholder="Purpose" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('xrays.list.allPurposes')}</SelectItem>
            {PURPOSES.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p}
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
          title={t('xrays.list.emptyTitle') + '...'}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<ScanLine className="h-6 w-6" />}
          title={t('xrays.list.emptyTitle')}
          description={t('xrays.list.emptyDescription')}
          action={{ label: t('xrays.list.uploadButton'), onClick: () => navigate('/xrays/upload') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('xrays.deleteDialog.title')}
        description={`"${deleteTarget?.title}" ${t('xrays.deleteDialog.description')}`}
        confirmLabel={t('common.actions.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
