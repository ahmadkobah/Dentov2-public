/**
 * Appointment Types Page — DataTable CRUD list.
 * BUILD_RULES §8.1, §9.3, §15.2.
 */

import { useState } from 'react';
import {
  useAppointmentTypeList,
  useCreateAppointmentType,
  useUpdateAppointmentType,
  useDeleteAppointmentType,
  type AppointmentTypeItem,
} from '../hooks/useAppointmentTypes.js';
import { AppointmentTypeForm } from '../components/AppointmentTypeForm.js';
import type { CreateAppointmentTypeInput } from '@dento/shared';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { formatCurrency } from '@/lib/currency.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Badge,
  Dialog,
  DialogContent,
  ConfirmDialog,
  type ColumnDef,
  toast,
} from '@dento/ui';
import { Plus, Palette, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@dento/ui';

export default function AppointmentTypesPage() {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';

  // ── Query ─────────────────────────────────────────────
  const { data: types, isLoading, isError, error, refetch } = useAppointmentTypeList();

  // ── Mutations ─────────────────────────────────────────
  const createMutation = useCreateAppointmentType();
  const deleteMutation = useDeleteAppointmentType();

  // ── Dialog state ──────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<AppointmentTypeItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppointmentTypeItem | null>(null);

  // ── Columns ───────────────────────────────────────────
  const columns: ColumnDef<AppointmentTypeItem>[] = [
    {
      id: 'color',
      header: '',
      cell: (_value: unknown, row: AppointmentTypeItem) => (
        <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: row.color }} />
      ),
    },
    {
      id: 'name',
      header: t('appointmentTypes.col.name'),
      accessorFn: (row) => row.name[lang] || row.name.en,
      sortable: true,
    },
    {
      id: 'code',
      header: t('appointmentTypes.col.code'),
      accessorFn: (row) => row.code,
    },
    {
      id: 'duration',
      header: t('appointmentTypes.col.duration'),
      cell: (_value: unknown, row: AppointmentTypeItem) => `${row.defaultDuration} min`,
    },
    {
      id: 'fee',
      header: t('appointmentTypes.col.fee'),
      cell: (_value: unknown, row: AppointmentTypeItem) =>
        row.defaultFee != null ? formatCurrency(row.defaultFee) : '—',
    },
    {
      id: 'flags',
      header: t('appointmentTypes.col.flags'),
      cell: (_value: unknown, row: AppointmentTypeItem) => (
        <div className="flex gap-1">
          {row.isDoctorRequired && (
            <Badge variant="outline">{t('appointmentTypes.badge.doctor')}</Badge>
          )}
          {row.isOnlineBookingAllowed && (
            <Badge variant="secondary">{t('appointmentTypes.badge.online')}</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'status',
      header: t('appointmentTypes.col.status'),
      cell: (_value: unknown, row: AppointmentTypeItem) => (
        <div className="flex gap-1">
          <Badge variant={row.isActive ? 'default' : 'destructive'}>
            {row.isActive
              ? t('appointmentTypes.badge.active')
              : t('appointmentTypes.badge.inactive')}
          </Badge>
          {row.isDefault && <Badge variant="outline">{t('appointmentTypes.badge.default')}</Badge>}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_value: unknown, row: AppointmentTypeItem) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Type actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditTarget(row)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('appointmentTypes.action.edit')}
            </DropdownMenuItem>
            {!row.isDefault && (
              <DropdownMenuItem onClick={() => setDeleteTarget(row)} className="text-destructive">
                <Trash2 className="me-2 h-4 w-4" />
                {t('appointmentTypes.action.delete')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Handlers ──────────────────────────────────────────

  const handleCreateSubmit = async (data: CreateAppointmentTypeInput) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateDialog(false);
      toast.success(t('appointmentTypes.toast.created'));
    } catch {
      toast.error(t('appointmentTypes.toast.createFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
      toast.success(t('appointmentTypes.toast.deactivated'));
    } catch {
      toast.error(t('appointmentTypes.toast.deactivateFailed'));
    }
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('appointmentTypes.title')} description={t('appointmentTypes.subtitle')}>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('appointmentTypes.newType')}
        </Button>
      </PageHeader>

      {isLoading ? (
        <TableSkeleton columns={7} rows={6} />
      ) : isError ? (
        <ErrorState
          title={t('appointmentTypes.error.load')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !types?.length ? (
        <EmptyState
          icon={<Palette className="h-7 w-7" />}
          title={t('appointmentTypes.empty.title')}
          description={t('appointmentTypes.empty.desc')}
          action={{ label: 'New Type', onClick: () => setShowCreateDialog(true) }}
        />
      ) : (
        <DataTable columns={columns} data={types} rowKey={(row) => row._id} />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-xl">
          <AppointmentTypeForm
            onSubmit={handleCreateSubmit}
            isPending={createMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editTarget && (
        <EditAppointmentTypeDialog
          appointmentType={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('appointmentTypes.confirm.deactivateTitle')}
        description={t('appointmentTypes.confirm.deactivateDesc')}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

/* ── Edit sub-dialog (needs its own mutation instance) ─── */

function EditAppointmentTypeDialog({
  appointmentType,
  onClose,
}: {
  appointmentType: AppointmentTypeItem;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const updateMutation = useUpdateAppointmentType(appointmentType._id);

  const handleSubmit = async (data: CreateAppointmentTypeInput) => {
    try {
      await updateMutation.mutateAsync(data);
      onClose();
      toast.success(t('appointmentTypes.toast.updated'));
    } catch {
      toast.error(t('appointmentTypes.toast.updateFailed'));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <AppointmentTypeForm
          defaultValues={{
            name: { en: appointmentType.name.en, ar: appointmentType.name.ar ?? '' },
            code: appointmentType.code,
            defaultDuration: appointmentType.defaultDuration,
            color: appointmentType.color,
            icon: appointmentType.icon,
            isDoctorRequired: appointmentType.isDoctorRequired,
            isOnlineBookingAllowed: appointmentType.isOnlineBookingAllowed,
            defaultFee: appointmentType.defaultFee,
          }}
          onSubmit={handleSubmit}
          isPending={updateMutation.isPending}
          mode="edit"
          isDefault={appointmentType.isDefault}
        />
      </DialogContent>
    </Dialog>
  );
}
