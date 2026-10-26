/**
 * Patient List Page — per BUILD_RULES §8.1, §9.3, §15.2.
 * DataTable with server-side pagination, search, filters.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../stores/locale.store.js';
import { usePatientList, useDeletePatient, type PatientListItem } from '../hooks/usePatients.js';
import { getPatientColumns } from '../components/PatientColumns.js';
import { PatientForm } from '../components/PatientForm.js';
import type { CreatePatientInput, PatientQuery } from '@dento/shared';
import { useCreatePatient } from '../hooks/usePatients.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ConfirmDialog,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast,
} from '@dento/ui';
import { Plus, Users, Search, AlertTriangle } from 'lucide-react';
import { ApiError } from '@/lib/api-client.js';

export default function PatientListPage() {
  const navigate = useNavigate();
  const locale = useThemeStore((s) => s.locale);
  const { t } = useTranslation();

  // ── Filter state (URL state per §8.5) ─────────────────────
  const [filters, setFilters] = useState<PatientQuery>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [search, setSearch] = useState('');

  // ── Queries ───────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = usePatientList({
    ...filters,
    search: search || undefined,
  });

  // ── Mutations ─────────────────────────────────────────────
  const createMutation = useCreatePatient();
  const deleteMutation = useDeletePatient();

  // ── Dialog state ──────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientListItem | null>(null);

  // Phase 4.2 — possible-duplicate modal state
  type DuplicateMatch = {
    _id: string;
    patientCode?: string;
    firstName?: { en?: string; ar?: string };
    lastName?: { en?: string; ar?: string };
    phone?: string;
    email?: string;
    nationalId?: string;
  };
  const [duplicateState, setDuplicateState] = useState<{
    matches: DuplicateMatch[];
    pendingPayload: CreatePatientInput;
  } | null>(null);

  // ── Handlers ──────────────────────────────────────────────

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const columnActions = {
    onView: (patient: PatientListItem) => navigate(`/patients/${patient._id}`),
    onEdit: (patient: PatientListItem) => navigate(`/patients/${patient._id}?tab=edit`),
    onDelete: (patient: PatientListItem) => setDeleteTarget(patient),
  };

  const columns = getPatientColumns(columnActions, locale as 'ar' | 'en', t);

  const handleCreateSubmit = async (data: CreatePatientInput) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateDialog(false);
      toast.success(t('patients.toast.created'));
    } catch (err) {
      // Phase 4.2 — surface POSSIBLE_DUPLICATE 409 as a chooser modal
      if (err instanceof ApiError && err.statusCode === 409 && err.error === 'POSSIBLE_DUPLICATE') {
        const details = err.details as { matches?: DuplicateMatch[] } | undefined;
        setDuplicateState({
          matches: details?.matches ?? [],
          pendingPayload: data,
        });
        return;
      }
      toast.error(t('patients.toast.createFailed'));
    }
  };

  const handleCreateAnyway = async () => {
    if (!duplicateState) return;
    try {
      await createMutation.mutateAsync({
        ...duplicateState.pendingPayload,
        duplicateOverride: true,
      } as CreatePatientInput & { duplicateOverride: boolean });
      setDuplicateState(null);
      setShowCreateDialog(false);
      toast.success(t('patients.toast.created'));
    } catch {
      toast.error(t('patients.toast.createFailed'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
      toast.success(t('patients.toast.deactivated'));
    } catch {
      toast.error(t('patients.toast.deactivateFailed'));
    }
  };

  // ── Sort handler ──────────────────────────────────────────

  const handleSort = (column: string, direction: 'asc' | 'desc' | null) => {
    if (!direction) {
      setFilters((prev) => ({ ...prev, sortBy: 'createdAt', sortOrder: 'desc' }));
    } else {
      setFilters((prev) => ({
        ...prev,
        sortBy: column as PatientQuery['sortBy'],
        sortOrder: direction,
      }));
    }
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('patients.title')} description={t('patients.subtitle')}>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('patients.newPatient')}
        </Button>
      </PageHeader>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('patients.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </form>
        <Select
          value={filters.gender ?? 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              gender: v === 'all' ? undefined : (v as PatientQuery['gender']),
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('patients.filter.allGenders')}</SelectItem>
            <SelectItem value="male">{t('patients.filter.male')}</SelectItem>
            <SelectItem value="female">{t('patients.filter.female')}</SelectItem>
            <SelectItem value="other">{t('patients.filter.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / States */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={10} />
      ) : isError ? (
        <ErrorState title="Failed to load patients" message={error?.message} onRetry={refetch} />
      ) : !data?.patients.length ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title={t('patients.empty.title')}
          description={t('patients.empty.description')}
          action={{ label: t('patients.newPatient'), onClick: () => setShowCreateDialog(true) }}
        />
      ) : (
        <DataTable
          columns={columns}
          data={data.patients}
          pageSize={filters.limit}
          currentPage={filters.page}
          totalItems={data.pagination.total}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          sortColumn={filters.sortBy}
          sortDirection={filters.sortOrder}
          onSort={handleSort}
          rowKey={(row) => row._id}
          onRowClick={(row) => navigate(`/patients/${row._id}`)}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl">
          <PatientForm
            onSubmit={handleCreateSubmit}
            isPending={createMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('patients.confirm.deactivateTitle')}
        description={t('patients.confirm.deactivateMessage')}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        variant="destructive"
      />

      {/* Phase 4.2 — Possible-duplicate chooser */}
      <Dialog open={!!duplicateState} onOpenChange={(open) => !open && setDuplicateState(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('patients.duplicate.title') || 'Possible duplicate patient'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('patients.duplicate.description') ||
              'A patient with matching phone, email, or national ID already exists. Choose an existing record or create a new one anyway.'}
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {(duplicateState?.matches ?? []).map((m) => {
              const name =
                `${m.firstName?.[locale === 'ar' ? 'ar' : 'en'] ?? m.firstName?.en ?? ''} ${m.lastName?.[locale === 'ar' ? 'ar' : 'en'] ?? m.lastName?.en ?? ''}`.trim() ||
                m.patientCode ||
                m._id;
              return (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => {
                    setDuplicateState(null);
                    setShowCreateDialog(false);
                    navigate(`/patients/${m._id}`);
                  }}
                  className="w-full text-start rounded-md border p-3 hover:bg-accent transition"
                >
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground space-x-2">
                    {m.patientCode && <span>{m.patientCode}</span>}
                    {m.phone && <span>· {m.phone}</span>}
                    {m.email && <span>· {m.email}</span>}
                    {m.nationalId && <span>· ID {m.nationalId}</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDuplicateState(null)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCreateAnyway}
              disabled={createMutation.isPending}
            >
              {t('patients.duplicate.createAnyway') || 'Create anyway'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
