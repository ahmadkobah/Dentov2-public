/**
 * Prescription List Page — per DENTO_V2_MASTER_PLAN.md §10 (Module #10).
 * DataTable with server-side pagination, search, status filters.
 */

import { useState, useCallback } from 'react';
import {
  usePrescriptionList,
  useDeletePrescription,
  useUpdatePrescriptionStatus,
  type Prescription,
  type PrescriptionFilters,
} from '../hooks/usePrescriptions.js';
import { formatDate } from '@/lib/date.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
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
  FileText,
  Search,
  MoreHorizontal,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  Plus,
  Eye,
  Pencil,
  Printer,
} from 'lucide-react';
import type { PrescriptionItem } from '../hooks/usePrescriptions.js';
import { PrescriptionForm } from '../components/PrescriptionForm.js';
import { ViewPrescriptionModal } from '../components/ViewPrescriptionModal.js';
import { useTranslation } from '../../../stores/locale.store.js';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  active: 'default',
  dispensed: 'secondary',
  cancelled: 'destructive',
};

export interface PrescriptionListPageProps {
  patientId?: string;
}

export default function PrescriptionListPage({ patientId }: PrescriptionListPageProps = {}) {
  const { t } = useTranslation();

  const [showCreate, setShowCreate] = useState(false);
  const [viewTarget, setViewTarget] = useState<Prescription | null>(null);
  const [editTarget, setEditTarget] = useState<Prescription | null>(null);
  const [filters, setFilters] = useState<PrescriptionFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Prescription | null>(null);

  const { data, isLoading, isError, error, refetch } = usePrescriptionList({
    ...filters,
    search: search || undefined,
    ...(patientId ? { patientId } : {}),
  });

  const deleteMutation = useDeletePrescription();
  const statusMutation = useUpdatePrescriptionStatus();

  const items = data?.items ?? [];

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('prescriptions.toast.deleted'));
    } catch {
      toast.error(t('prescriptions.toast.deleteFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const handleStatusChange = useCallback(
    async (id: string, status: string) => {
      try {
        await statusMutation.mutateAsync({ id, status });
        toast.success(t('prescriptions.toast.statusUpdated', { status }));
      } catch {
        toast.error(t('prescriptions.toast.statusUpdateFailed'));
      }
    },
    [statusMutation],
  );

  const columns: ColumnDef<Prescription>[] = [
    {
      id: 'prescriptionNumber',
      accessorKey: 'prescriptionNumber',
      header: t('prescriptions.col.rxNumber'),
      cell: (_v: unknown, row: Prescription) => (
        <span className="font-mono text-sm">{row.prescriptionNumber}</span>
      ),
    },
    {
      id: 'patientId',
      accessorKey: 'patientId',
      header: t('prescriptions.col.patient'),
      cell: (_v: unknown, row: Prescription) => {
        if (typeof row.patientId === 'object' && row.patientId !== null) {
          const p = row.patientId;
          return (
            <span className="text-sm">
              {p.firstName?.en} {p.lastName?.en}
            </span>
          );
        }
        return <span className="text-muted-foreground text-sm">{String(row.patientId)}</span>;
      },
    },
    {
      id: 'items',
      accessorKey: 'items',
      header: t('prescriptions.col.items'),
      cell: (_v: unknown, row: Prescription) => (
        <div className="text-sm">
          <span className="font-medium">
            {t('prescriptions.items.medications', { count: row.items?.length ?? 0 })}
          </span>
          {(row.items?.length ?? 0) > 0 && (
            <div className="text-muted-foreground truncate max-w-[200px]">
              {row.items.map((i: PrescriptionItem) => i.medicationName).join(', ')}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'diagnosis',
      accessorKey: 'diagnosis',
      header: t('prescriptions.col.diagnosis'),
      cell: (_v: unknown, row: Prescription) => (
        <span className="text-muted-foreground max-w-[150px] truncate text-sm">
          {row.diagnosis || '—'}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: t('prescriptions.col.status'),
      cell: (_v: unknown, row: Prescription) => (
        <Badge variant={STATUS_COLORS[row.status] ?? 'outline'} className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: t('prescriptions.col.date'),
      cell: (_v: unknown, row: Prescription) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, rx: Prescription) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setViewTarget(rx)}>
              <Eye className="me-2 h-4 w-4" />
              {t('prescriptions.action.view')}
            </DropdownMenuItem>
            {(rx.status === 'draft' || rx.status === 'active') && (
              <DropdownMenuItem onClick={() => setEditTarget(rx)}>
                <Pencil className="me-2 h-4 w-4" />
                {t('prescriptions.action.edit')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setViewTarget(rx);
                setTimeout(() => {
                  const btn = document.querySelector('[data-print-rx]') as HTMLButtonElement;
                  btn?.click();
                }, 300);
              }}
            >
              <Printer className="me-2 h-4 w-4" />
              {t('prescriptions.action.print')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {rx.status === 'draft' && (
              <DropdownMenuItem onClick={() => handleStatusChange(rx._id, 'active')}>
                <CheckCircle className="me-2 h-4 w-4" />
                {t('prescriptions.action.activate')}
              </DropdownMenuItem>
            )}
            {rx.status === 'active' && (
              <DropdownMenuItem onClick={() => handleStatusChange(rx._id, 'dispensed')}>
                <Package className="me-2 h-4 w-4" />
                {t('prescriptions.action.markDispensed')}
              </DropdownMenuItem>
            )}
            {(rx.status === 'draft' || rx.status === 'active') && (
              <DropdownMenuItem onClick={() => handleStatusChange(rx._id, 'cancelled')}>
                <XCircle className="me-2 h-4 w-4" />
                {t('prescriptions.action.cancel')}
              </DropdownMenuItem>
            )}
            {rx.status === 'draft' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteTarget(rx)} className="text-destructive">
                  <Trash2 className="me-2 h-4 w-4" />
                  {t('prescriptions.action.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Filters + Action */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('prescriptions.search')}
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
            <SelectItem value="all">{t('prescriptions.filter.allStatuses')}</SelectItem>
            <SelectItem value="draft">{t('prescriptions.filter.draft')}</SelectItem>
            <SelectItem value="active">{t('prescriptions.filter.active')}</SelectItem>
            <SelectItem value="dispensed">{t('prescriptions.filter.dispensed')}</SelectItem>
            <SelectItem value="cancelled">{t('prescriptions.filter.cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto">
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('prescriptions.newPrescription')}
          </Button>
        </div>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('prescriptions.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={t('prescriptions.empty.title')}
          description={t('prescriptions.empty.description')}
          action={{ label: t('prescriptions.newPrescription'), onClick: () => setShowCreate(true) }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('prescriptions.delete.title')}
        description={t('prescriptions.delete.description', {
          number: deleteTarget?.prescriptionNumber ?? '',
        })}
        confirmLabel={t('prescriptions.delete.confirm')}
        variant="destructive"
        onConfirm={handleDelete}
      />

      <PrescriptionForm open={showCreate} onClose={() => setShowCreate(false)} />

      <ViewPrescriptionModal
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        prescription={viewTarget}
      />

      {editTarget && (
        <PrescriptionForm
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          prescription={editTarget}
        />
      )}
    </div>
  );
}
