/**
 * Treatment Plans Page — list & manage treatment plans.
 * Per DENTO_V2_MASTER_PLAN.md §11 — Treatment Plans Module
 * Per BUILD_RULES §8.1, §15.2 — Phase 3 Week 10.
 *
 * Features:
 * - DataTable with status, patient, cost columns
 * - Status filter, search
 * - Status badge colouring
 * - Create dialog stub (Phase 4 will add full form)
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useTreatmentPlanList,
  useUpdateTreatmentPlan,
  useDeleteTreatmentPlan,
  useUpdateTreatmentPlanStatus,
  type TreatmentPlan,
} from '../hooks/useTreatmentPlans.js';
import { TreatmentPlanForm } from '../components/TreatmentPlanForm.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import type { CreateTreatmentPlanInput } from '@dento/shared';
import {
  PageHeader,
  Button,
  Badge,
  DataTable,
  type ColumnDef,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  ConfirmDialog,
  EmptyState,
  toast,
} from '@dento/ui';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { formatCurrency, useTenantCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Status helpers ──────────────────────────────────────────

const STATUS_OPTIONS = [
  'all',
  'draft',
  'proposed',
  'accepted',
  'in_progress',
  'completed',
  'cancelled',
  'expired',
] as const;

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  proposed: 'outline',
  accepted: 'default',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
  expired: 'secondary',
};

// ── Component ───────────────────────────────────────────────

export interface TreatmentPlansPageProps {
  patientId?: string;
}

export default function TreatmentPlansPage({ patientId }: TreatmentPlansPageProps = {}) {
  const navigate = useNavigate();
  const currency = useTenantCurrency();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);

  const query = useMemo(
    () => ({
      page,
      limit: 20,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
      ...(patientId ? { patientId } : {}),
    }),
    [page, statusFilter, search, patientId],
  );

  const { data, isLoading, isError, error } = useTreatmentPlanList(query);
  const updateMutation = useUpdateTreatmentPlan();
  const deleteMutation = useDeleteTreatmentPlan();
  const statusMutation = useUpdateTreatmentPlanStatus();

  const handleEdit = async (formData: CreateTreatmentPlanInput) => {
    if (!editingPlan) return;
    try {
      await updateMutation.mutateAsync({
        id: editingPlan._id,
        data: formData as Record<string, unknown>,
      });
      setEditingPlan(null);
      toast.success(t('treatmentPlans.toast.updated'));
    } catch {
      toast.error(t('treatmentPlans.toast.updateFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success(t('treatmentPlans.toast.deleted'));
      setDeleteId(null);
    } catch {
      toast.error(t('treatmentPlans.toast.deleteFailed'));
    }
  };

  // Quick actions
  const handleStatusChange = async (id: string, status: string) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(t('treatmentPlans.toast.statusUpdated'));
    } catch {
      toast.error(t('treatmentPlans.toast.statusUpdateFailed'));
    }
  };

  // ── Columns ────────────────────────────────────────────────

  const columns: ColumnDef<TreatmentPlan>[] = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'title' as const,
        header: 'Title',
        cell: (value: unknown) => <span className="font-medium">{value as string}</span>,
      },
      {
        id: 'status',
        accessorKey: 'status' as const,
        header: 'Status',
        cell: (value: unknown) => (
          <Badge variant={STATUS_VARIANT[value as string] ?? 'outline'}>
            {(value as string).replace(/_/g, ' ')}
          </Badge>
        ),
      },
      {
        id: 'items',
        header: 'Items',
        accessorFn: (row: TreatmentPlan) => row.items?.length ?? 0,
      },
      {
        id: 'totalCost',
        accessorKey: 'totalCost' as const,
        header: 'Total',
        cell: (value: unknown) => formatCurrency(value as number, currency),
      },
      {
        id: 'finalCost',
        accessorKey: 'finalCost' as const,
        header: 'Final',
        cell: (value: unknown) => (
          <span className="font-semibold">{formatCurrency(value as number, currency)}</span>
        ),
      },
      {
        id: 'validUntil',
        accessorKey: 'validUntil' as const,
        header: 'Valid Until',
        cell: (value: unknown) => (value ? formatDate(value as string) : '—'),
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt' as const,
        header: 'Created',
        cell: (value: unknown) => formatDate(value as string),
      },
      {
        id: 'actions',
        header: '',
        cell: (_: unknown, row: TreatmentPlan) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/treatment-plans/${row._id}`)}
              aria-label="View plan"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingPlan(row)}
              aria-label="Edit plan"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.status === 'draft' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(row._id, 'proposed')}
              >
                Propose
              </Button>
            )}
            {row.status === 'proposed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusChange(row._id, 'accepted')}
              >
                Accept
              </Button>
            )}
            {row.status === 'draft' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteId(row._id)}
                aria-label="Delete plan"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Render ─────────────────────────────────────────────────

  if (isLoading) return <TableSkeleton />;
  if (isError) return <ErrorState message={(error as Error)?.message ?? 'Failed to load plans'} />;

  const plans = data?.plans ?? [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('treatmentPlans.page.title')}
        description={`${pagination?.total ?? 0} ${t('treatmentPlans.page.plans')}`}
      >
        <Button size="sm" onClick={() => navigate('/treatment-plans/new')}>
          <Plus className="me-2 h-4 w-4" />
          {t('treatmentPlans.page.newPlan')}
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder={t('treatmentPlans.page.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as (typeof STATUS_OPTIONS)[number]);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? t('treatmentPlans.page.allStatuses') : s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {plans.length === 0 ? (
        <EmptyState
          title={t('treatmentPlans.page.emptyTitle')}
          description={t('treatmentPlans.page.emptyDescription')}
        />
      ) : (
        <DataTable columns={columns} data={plans} />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Treatment Plan"
        description="This will permanently delete this draft treatment plan. This action cannot be undone."
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-2xl">
          {editingPlan && (
            <TreatmentPlanForm
              defaultValues={{
                patientId: editingPlan.patientId,
                doctorId: editingPlan.doctorId,
                title: editingPlan.title,
                description: editingPlan.description,
                discountType: editingPlan.discountType,
                discountValue: editingPlan.discountValue,
                validUntil: editingPlan.validUntil,
                notes: editingPlan.notes,
              }}
              onSubmit={handleEdit}
              isPending={updateMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
