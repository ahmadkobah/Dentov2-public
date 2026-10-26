/**
 * 3D Scan List Page — DataTable with search, type/status filters.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScanList, useDeleteScan, type Scan, type ScanFilters } from '../hooks/useScan.js';
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
import { Plus, Box, Search, MoreHorizontal, Trash2, Eye } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  uploaded: 'outline',
  ready: 'default',
  error: 'destructive',
};

const TYPE_LABELS: Record<string, string> = {
  full_arch: 'Full Arch',
  upper_arch: 'Upper Arch',
  lower_arch: 'Lower Arch',
  bite_registration: 'Bite Registration',
  single_tooth: 'Single Tooth',
  other: 'Other',
};

export interface ScanListPageProps {
  patientId?: string;
}

export default function ScanListPage({ patientId }: ScanListPageProps = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<ScanFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Scan | null>(null);

  const { data, isLoading, isError, error, refetch } = useScanList({
    ...filters,
    search: search || undefined,
    ...(patientId ? { patientId } : {}),
  });

  const deleteMutation = useDeleteScan();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('scans.toast.deleted'));
    } catch {
      toast.error(t('scans.toast.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const columns: ColumnDef<Scan>[] = [
    {
      id: 'scanNumber',
      accessorKey: 'scanNumber',
      header: t('scans.col.scanNumber'),
      cell: (_v: unknown, row: Scan) => <span className="font-mono text-sm">{row.scanNumber}</span>,
    },
    {
      id: 'patientId',
      accessorKey: 'patientId',
      header: t('scans.col.patient'),
      cell: (_v: unknown, row: Scan) => {
        const p = row.patient ?? (row.patientId as unknown as Scan['patient']);
        if (p && typeof p === 'object') {
          const name = `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim();
          if (name) return <span className="text-sm">{name}</span>;
        }
        return <span className="text-sm text-muted-foreground">{String(row.patientId)}</span>;
      },
    },
    {
      id: 'scanType',
      accessorKey: 'scanType',
      header: t('scans.col.type'),
      cell: (_v: unknown, row: Scan) => (
        <span className="text-sm">{TYPE_LABELS[row.scanType] ?? row.scanType}</span>
      ),
    },
    {
      id: 'formats',
      accessorKey: 'formats',
      header: t('scans.col.formats'),
      cell: (_v: unknown, row: Scan) => (
        <span className="text-muted-foreground text-xs uppercase">
          {row.formats?.join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'fileSizeMB',
      accessorKey: 'fileSizeMB',
      header: t('scans.col.size'),
      cell: (_v: unknown, row: Scan) => (
        <span className="text-sm">{row.fileSizeMB?.toFixed(1)} MB</span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('scans.col.status'),
      cell: (_v: unknown, row: Scan) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'scanDate',
      accessorKey: 'scanDate',
      header: t('scans.col.date'),
      cell: (_v: unknown, row: Scan) => {
        const d = row.scanDate ?? row.createdAt;
        if (!d) return <span className="text-muted-foreground">—</span>;
        return formatDate(d);
      },
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, scan: Scan) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/scans/${scan._id}`)}>
              <Eye className="me-2 h-4 w-4" />
              {t('scans.action.view')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeleteTarget(scan)} className="text-destructive">
              <Trash2 className="me-2 h-4 w-4" />
              {t('scans.action.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('scans.title')} description={t('scans.subtitle')}>
        <Button onClick={() => navigate('/scans/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('scans.newScan')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute inset-s-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('scans.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

        <Select
          value={filters.scanType || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              scanType: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Scan Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scans.filter.allTypes')}</SelectItem>
            <SelectItem value="full_arch">{t('scans.type.fullArch')}</SelectItem>
            <SelectItem value="upper_arch">{t('scans.type.upperArch')}</SelectItem>
            <SelectItem value="lower_arch">{t('scans.type.lowerArch')}</SelectItem>
            <SelectItem value="bite_registration">{t('scans.type.bite')}</SelectItem>
            <SelectItem value="single_tooth">{t('scans.type.singleTooth')}</SelectItem>
          </SelectContent>
        </Select>

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
          <SelectTrigger className="w-35">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('scans.filter.allStatuses')}</SelectItem>
            <SelectItem value="uploaded">{t('scans.status.uploaded')}</SelectItem>
            <SelectItem value="ready">{t('scans.status.ready')}</SelectItem>
            <SelectItem value="error">{t('scans.status.error')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={8} rows={10} />
      ) : isError ? (
        <ErrorState title={t('scans.error.load')} message={error?.message} onRetry={refetch} />
      ) : !items.length ? (
        <EmptyState
          icon={<Box className="h-6 w-6" />}
          title={t('scans.empty.title')}
          description={t('scans.empty.desc')}
          action={{ label: t('scans.newScan'), onClick: () => navigate('/scans/new') }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('scans.confirm.deleteTitle')}
        description={t('scans.confirm.deleteDesc', { number: deleteTarget?.scanNumber ?? '' })}
        confirmLabel={t('common.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
