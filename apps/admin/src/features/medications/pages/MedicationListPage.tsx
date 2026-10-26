/**
 * Medication List Page — Medications catalog management.
 * DataTable with server-side pagination, search, filters.
 * Create + Edit medication dialog, Default/Custom badge, Deactivate/Restore.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  useMedicationList,
  useCreateMedication,
  useUpdateMedication,
  useDeleteMedication,
  useRestoreMedication,
  type Medication,
  type MedicationFilters,
} from '../hooks/useMedications.js';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
} from '@dento/ui';
import {
  Pill,
  Search,
  MoreHorizontal,
  Trash2,
  RotateCcw,
  Plus,
  Pencil,
  Loader2,
} from 'lucide-react';
import { useSupportedLanguages } from '../../../hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

const CATEGORIES = [
  'analgesic',
  'antibiotic',
  'anti-inflammatory',
  'anesthetic',
  'antiseptic',
  'antifungal',
  'corticosteroid',
  'other',
] as const;

const DOSAGE_FORMS = [
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'cream',
  'gel',
  'mouthwash',
  'drops',
  'spray',
  'powder',
  'other',
] as const;

interface MedicationFormData {
  nameEn: string;
  nameAr: string;
  genericName: string;
  category: string;
  dosageForm: string;
  strength: string;
  defaultDosage: string;
  defaultFrequency: string;
  defaultDuration: string;
  instructionsEn: string;
  instructionsAr: string;
}

const emptyForm = (): MedicationFormData => ({
  nameEn: '',
  nameAr: '',
  genericName: '',
  category: 'antibiotic',
  dosageForm: 'tablet',
  strength: '',
  defaultDosage: '',
  defaultFrequency: '',
  defaultDuration: '',
  instructionsEn: '',
  instructionsAr: '',
});

export default function MedicationListPage() {
  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();
  const [filters, setFilters] = useState<MedicationFilters>({
    page: 1,
    limit: 20,
    sortBy: 'nameEn',
    sortOrder: 'asc',
  });
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Medication | null>(null);
  const [form, setForm] = useState<MedicationFormData>(emptyForm());

  const { data, isLoading, isError, error, refetch } = useMedicationList({
    ...filters,
    search: search || undefined,
  });

  const createMutation = useCreateMedication();
  const updateMutation = useUpdateMedication(editTarget?._id ?? '');
  const deleteMutation = useDeleteMedication();
  const restoreMutation = useRestoreMedication();

  const items = data?.items ?? [];

  // Pre-populate form when editing
  useEffect(() => {
    if (editTarget) {
      setForm({
        nameEn: editTarget.nameEn,
        nameAr: editTarget.nameAr || '',
        genericName: editTarget.genericName || '',
        category: editTarget.category,
        dosageForm: editTarget.dosageForm,
        strength: editTarget.strength || '',
        defaultDosage: editTarget.defaultDosage || '',
        defaultFrequency: editTarget.defaultFrequency || '',
        defaultDuration: editTarget.defaultDuration || '',
        instructionsEn: editTarget.instructionsEn || '',
        instructionsAr: editTarget.instructionsAr || '',
      });
    }
  }, [editTarget]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget._id);
      toast.success(t('medications.toast.deactivated'));
    } catch {
      toast.error(t('medications.toast.deactivateFailed'));
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, t]);

  const handleRestore = useCallback(
    async (id: string) => {
      try {
        await restoreMutation.mutateAsync(id);
        toast.success(t('medications.toast.restored'));
      } catch {
        toast.error(t('medications.toast.restoreFailed'));
      }
    },
    [restoreMutation, t],
  );

  const handleCloseForm = useCallback(() => {
    setCreateOpen(false);
    setEditTarget(null);
    setForm(emptyForm());
  }, []);

  const handleSubmitForm = useCallback(async () => {
    if (!form.nameEn.trim()) {
      toast.error(t('medications.toast.nameRequired'));
      return;
    }
    try {
      if (editTarget) {
        await updateMutation.mutateAsync(form);
        toast.success(t('medications.toast.updated'));
      } else {
        await createMutation.mutateAsync(form);
        toast.success(t('medications.toast.created'));
      }
      handleCloseForm();
    } catch {
      toast.error(
        editTarget ? t('medications.toast.updateFailed') : t('medications.toast.createFailed'),
      );
    }
  }, [form, editTarget, createMutation, updateMutation, handleCloseForm, t]);

  const columns: ColumnDef<Medication>[] = [
    {
      id: 'nameEn',
      accessorKey: 'nameEn',
      header: t('medications.columns.name'),
      cell: (_value: unknown, row: Medication) => (
        <div>
          <div className="font-medium">{row.nameEn}</div>
          {row.nameAr && (
            <div className="text-muted-foreground text-sm" dir="rtl">
              {row.nameAr}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'genericName',
      accessorKey: 'genericName',
      header: t('medications.columns.genericName'),
    },
    {
      id: 'category',
      accessorKey: 'category',
      header: t('medications.columns.category'),
      cell: (_value: unknown, row: Medication) => (
        <Badge variant="outline" className="capitalize">
          {t(
            `medications.categories.${
              row.category === 'anti-inflammatory' ? 'antiInflammatory' : row.category
            }`,
            { defaultValue: row.category },
          )}
        </Badge>
      ),
    },
    {
      id: 'dosageForm',
      accessorKey: 'dosageForm',
      header: t('medications.columns.form'),
      cell: (_value: unknown, row: Medication) => (
        <span className="capitalize">
          {t(`medications.dosageForms.${row.dosageForm}`, { defaultValue: row.dosageForm })}
        </span>
      ),
    },
    {
      id: 'strength',
      accessorKey: 'strength',
      header: t('medications.columns.strength'),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: t('medications.columns.status'),
      cell: (_value: unknown, row: Medication) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.isActive ? 'default' : 'secondary'}>
            {row.isActive ? t('medications.status.active') : t('medications.status.inactive')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {row.isCustom ? t('medications.status.custom') : t('medications.status.default')}
          </Badge>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_: unknown, med: Medication) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditTarget(med)}>
              <Pencil className="me-2 h-4 w-4" />
              {t('medications.actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {!med.isActive && (
              <DropdownMenuItem onClick={() => handleRestore(med._id)}>
                <RotateCcw className="me-2 h-4 w-4" />
                {t('medications.actions.restore')}
              </DropdownMenuItem>
            )}
            {med.isActive && (
              <DropdownMenuItem onClick={() => setDeleteTarget(med)} className="text-destructive">
                <Trash2 className="me-2 h-4 w-4" />
                {t('medications.actions.deactivate')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFormOpen = createOpen || !!editTarget;

  return (
    <div className="space-y-6 p-6">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t('medications.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </form>

        <Select
          value={filters.category || 'all'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              category: v === 'all' ? undefined : v,
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('medications.filters.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('medications.filters.allCategories')}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {t(`medications.categories.${c === 'anti-inflammatory' ? 'antiInflammatory' : c}`, {
                  defaultValue: c,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.isActive === undefined ? 'all' : filters.isActive ? 'active' : 'inactive'}
          onValueChange={(v) =>
            setFilters((prev) => ({
              ...prev,
              isActive: v === 'all' ? undefined : v === 'active',
              page: 1,
            }))
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('medications.filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('medications.filters.allStatus')}</SelectItem>
            <SelectItem value="active">{t('medications.filters.active')}</SelectItem>
            <SelectItem value="inactive">{t('medications.filters.inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('medications.actions.addMedication')}
          </Button>
        </div>
      </div>

      {/* Data */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={10} />
      ) : isError ? (
        <ErrorState
          title={t('medications.error.loadFailed')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          icon={<Pill className="h-6 w-6" />}
          title={t('medications.empty.title')}
          description={t('medications.empty.description')}
          action={{
            label: t('medications.actions.addMedication'),
            onClick: () => setCreateOpen(true),
          }}
        />
      ) : (
        <DataTable columns={columns} data={items} />
      )}

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('medications.dialog.deactivateTitle')}
        description={t('medications.dialog.deactivateDescription', {
          name: deleteTarget?.nameEn ?? '',
        })}
        confirmLabel={t('medications.actions.deactivate')}
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Create / Edit Medication Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t('medications.dialog.editTitle') : t('medications.dialog.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {editTarget
                ? t('medications.dialog.editDescription')
                : t('medications.dialog.addDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('medications.form.labels.nameEnglish')}</Label>
                <Input
                  value={form.nameEn}
                  onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                  placeholder={t('medications.form.placeholders.nameEnglish')}
                />
              </div>
              {isMultiLang && (
                <div className="space-y-2">
                  <Label>{t('medications.form.labels.nameArabic')}</Label>
                  <Input
                    value={form.nameAr}
                    onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
                    placeholder={t('medications.form.placeholders.nameArabic')}
                    dir="rtl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('medications.form.labels.genericName')}</Label>
              <Input
                value={form.genericName}
                onChange={(e) => setForm((p) => ({ ...p, genericName: e.target.value }))}
                placeholder={t('medications.form.placeholders.genericName')}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('medications.form.labels.category')}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {t(
                          `medications.categories.${
                            c === 'anti-inflammatory' ? 'antiInflammatory' : c
                          }`,
                          { defaultValue: c.replace(/-/g, ' ') },
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('medications.form.labels.dosageForm')}</Label>
                <Select
                  value={form.dosageForm}
                  onValueChange={(v) => setForm((p) => ({ ...p, dosageForm: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSAGE_FORMS.map((f) => (
                      <SelectItem key={f} value={f} className="capitalize">
                        {t(`medications.dosageForms.${f}`, { defaultValue: f })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('medications.form.labels.strength')}</Label>
                <Input
                  value={form.strength}
                  onChange={(e) => setForm((p) => ({ ...p, strength: e.target.value }))}
                  placeholder={t('medications.form.placeholders.strength')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('medications.form.labels.defaultDosage')}</Label>
                <Input
                  value={form.defaultDosage}
                  onChange={(e) => setForm((p) => ({ ...p, defaultDosage: e.target.value }))}
                  placeholder={t('medications.form.placeholders.defaultDosage')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('medications.form.labels.defaultFrequency')}</Label>
                <Input
                  value={form.defaultFrequency}
                  onChange={(e) => setForm((p) => ({ ...p, defaultFrequency: e.target.value }))}
                  placeholder={t('medications.form.placeholders.defaultFrequency')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('medications.form.labels.defaultDuration')}</Label>
                <Input
                  value={form.defaultDuration}
                  onChange={(e) => setForm((p) => ({ ...p, defaultDuration: e.target.value }))}
                  placeholder={t('medications.form.placeholders.defaultDuration')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('medications.form.labels.instructionsEnglish')}</Label>
                <Input
                  value={form.instructionsEn}
                  onChange={(e) => setForm((p) => ({ ...p, instructionsEn: e.target.value }))}
                  placeholder={t('medications.form.placeholders.instructionsEnglish')}
                />
              </div>
              {isMultiLang && (
                <div className="space-y-2">
                  <Label>{t('medications.form.labels.instructionsArabic')}</Label>
                  <Input
                    value={form.instructionsAr}
                    onChange={(e) => setForm((p) => ({ ...p, instructionsAr: e.target.value }))}
                    placeholder={t('medications.form.placeholders.instructionsArabic')}
                    dir="rtl"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {t('medications.actions.cancel')}
            </Button>
            <Button
              onClick={handleSubmitForm}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {editTarget
                ? t('medications.actions.saveChanges')
                : t('medications.actions.addMedication')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
