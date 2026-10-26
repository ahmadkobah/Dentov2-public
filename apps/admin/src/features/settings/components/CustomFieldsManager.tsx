/**
 * CustomFieldsManager — Admin Settings tab for managing custom fields
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.6
 * Simplified interface embedded in the existing Settings page:
 * Entity selector → field list → inline create/edit via sheet.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from '@/stores/locale.store.js';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Label,
  Skeleton,
  ConfirmDialog,
} from '@dento/ui';
import {
  ListFilter,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  Hash,
  Type,
  Calendar,
  ToggleLeft as ToggleBool,
  List,
  ListChecks,
  AlignLeft,
  Mail,
  Phone,
  Link2,
  GripVertical,
} from 'lucide-react';
import type {
  CustomField,
  CustomFieldEntity,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from '@dento/shared';
import {
  useCustomFields,
  useCreateCustomField,
  useUpdateCustomField,
  useToggleCustomField,
  useDeleteCustomField,
} from '../hooks/useCustomFields.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ENTITIES: { key: CustomFieldEntity; label: string }[] = [
  { key: 'patient', label: 'settings.customFields.entities.patient' },
  { key: 'appointment', label: 'settings.customFields.entities.appointment' },
  { key: 'invoice', label: 'settings.customFields.entities.invoice' },
  { key: 'treatment_plan', label: 'settings.customFields.entities.treatmentPlan' },
  { key: 'prescription', label: 'settings.customFields.entities.prescription' },
  { key: 'lab_order', label: 'settings.customFields.entities.labOrder' },
];

const FIELD_TYPE_CONFIG: Record<string, { icon: typeof Type; label: string }> = {
  text: { icon: Type, label: 'settings.customFields.fieldTypes.text' },
  number: { icon: Hash, label: 'settings.customFields.fieldTypes.number' },
  date: { icon: Calendar, label: 'settings.customFields.fieldTypes.date' },
  boolean: { icon: ToggleBool, label: 'settings.customFields.fieldTypes.boolean' },
  select: { icon: List, label: 'settings.customFields.fieldTypes.select' },
  multiselect: { icon: ListChecks, label: 'settings.customFields.fieldTypes.multiSelect' },
  textarea: { icon: AlignLeft, label: 'settings.customFields.fieldTypes.textarea' },
  email: { icon: Mail, label: 'settings.customFields.fieldTypes.email' },
  phone: { icon: Phone, label: 'settings.customFields.fieldTypes.phone' },
  url: { icon: Link2, label: 'settings.customFields.fieldTypes.url' },
};

const FIELD_TYPES = Object.entries(FIELD_TYPE_CONFIG).map(([key, cfg]) => ({
  key,
  ...cfg,
}));

/* ------------------------------------------------------------------ */
/*  Inline Form State                                                  */
/* ------------------------------------------------------------------ */

interface FormState {
  entity: CustomFieldEntity;
  fieldKey: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  placeholderEn: string;
  placeholderAr: string;
  type: string;
  isRequired: boolean;
  isActive: boolean;
  showInList: boolean;
  showInForm: boolean;
  defaultValue: string;
  sortOrder: string;
  options: Array<{ labelEn: string; labelAr: string; value: string }>;
}

function emptyForm(entity: CustomFieldEntity): FormState {
  return {
    entity,
    fieldKey: '',
    labelEn: '',
    labelAr: '',
    descriptionEn: '',
    descriptionAr: '',
    placeholderEn: '',
    placeholderAr: '',
    type: 'text',
    isRequired: false,
    isActive: true,
    showInList: true,
    showInForm: true,
    defaultValue: '',
    sortOrder: '0',
    options: [],
  };
}

function fieldToForm(field: CustomField): FormState {
  return {
    entity: field.entity as CustomFieldEntity,
    fieldKey: field.fieldKey,
    labelEn: field.label.en,
    labelAr: field.label.ar ?? '',
    descriptionEn: field.description?.en ?? '',
    descriptionAr: field.description?.ar ?? '',
    placeholderEn: field.placeholder?.en ?? '',
    placeholderAr: field.placeholder?.ar ?? '',
    type: field.type,
    isRequired: field.isRequired,
    isActive: field.isActive,
    showInList: field.showInList,
    showInForm: field.showInForm,
    defaultValue: String(field.defaultValue ?? ''),
    sortOrder: String(field.sortOrder),
    options: (field.options ?? []).map((o) => ({
      labelEn: o.label.en,
      labelAr: o.label.ar ?? '',
      value: o.value,
    })),
  };
}

function formToCreateInput(form: FormState): CreateCustomFieldInput {
  return {
    entity: form.entity,
    fieldKey: form.fieldKey,
    label: { en: form.labelEn, ...(form.labelAr ? { ar: form.labelAr } : {}) },
    ...(form.descriptionEn
      ? {
          description: {
            en: form.descriptionEn,
            ...(form.descriptionAr ? { ar: form.descriptionAr } : {}),
          },
        }
      : {}),
    type: form.type as CreateCustomFieldInput['type'],
    isRequired: form.isRequired,
    isActive: form.isActive,
    showInList: form.showInList,
    showInForm: form.showInForm,
    ...(form.defaultValue ? { defaultValue: form.defaultValue } : {}),
    sortOrder: Number(form.sortOrder) || 0,
    ...(form.placeholderEn
      ? {
          placeholder: {
            en: form.placeholderEn,
            ...(form.placeholderAr ? { ar: form.placeholderAr } : {}),
          },
        }
      : {}),
    ...((form.type === 'select' || form.type === 'multiselect') && form.options.length > 0
      ? {
          options: form.options.map((o) => ({
            label: { en: o.labelEn, ...(o.labelAr ? { ar: o.labelAr } : {}) },
            value: o.value,
          })),
        }
      : {}),
  };
}

function formToUpdateInput(form: FormState): UpdateCustomFieldInput {
  return {
    label: { en: form.labelEn, ...(form.labelAr ? { ar: form.labelAr } : {}) },
    ...(form.descriptionEn
      ? {
          description: {
            en: form.descriptionEn,
            ...(form.descriptionAr ? { ar: form.descriptionAr } : {}),
          },
        }
      : {}),
    isRequired: form.isRequired,
    isActive: form.isActive,
    showInList: form.showInList,
    showInForm: form.showInForm,
    ...(form.defaultValue ? { defaultValue: form.defaultValue } : {}),
    sortOrder: Number(form.sortOrder) || 0,
    ...(form.placeholderEn
      ? {
          placeholder: {
            en: form.placeholderEn,
            ...(form.placeholderAr ? { ar: form.placeholderAr } : {}),
          },
        }
      : {}),
    ...((form.type === 'select' || form.type === 'multiselect') && form.options.length > 0
      ? {
          options: form.options.map((o) => ({
            label: { en: o.labelEn, ...(o.labelAr ? { ar: o.labelAr } : {}) },
            value: o.value,
          })),
        }
      : {}),
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CustomFieldsManager() {
  const [selectedEntity, setSelectedEntity] = useState<CustomFieldEntity>('patient');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm('patient'));

  // --- Data hooks ---
  const { data, isLoading } = useCustomFields({ entity: selectedEntity });
  const createMutation = useCreateCustomField();
  const updateMutation = useUpdateCustomField();
  const toggleMutation = useToggleCustomField();
  const deleteMutation = useDeleteCustomField();
  const { t } = useTranslation();

  // --- Derived ---
  const fields = useMemo(() => {
    const items = data?.items ?? [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (f) =>
        f.label.en.toLowerCase().includes(q) ||
        f.fieldKey.toLowerCase().includes(q) ||
        f.label.ar?.toLowerCase().includes(q),
    );
  }, [data, search]);

  // --- Handlers ---
  function openCreate() {
    setEditingField(null);
    setForm(emptyForm(selectedEntity));
    setFormOpen(true);
  }

  function openEdit(field: CustomField) {
    setEditingField(field);
    setForm(fieldToForm(field));
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingField(null);
  }

  function handleSave() {
    if (editingField) {
      updateMutation.mutate(
        { id: editingField._id, ...formToUpdateInput(form) },
        { onSuccess: closeForm },
      );
    } else {
      createMutation.mutate(formToCreateInput(form), { onSuccess: closeForm });
    }
  }

  function handleToggle(field: CustomField) {
    toggleMutation.mutate({ id: field._id, isActive: !field.isActive });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget._id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const isSelectType = form.type === 'select' || form.type === 'multiselect';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Entity Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListFilter className="h-5 w-5" />
            {t('settings.customFields.title')}
          </CardTitle>
          <CardDescription>{t('settings.customFields.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ENTITIES.map(({ key, label }) => (
              <Button
                key={key}
                variant={selectedEntity === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedEntity(key)}
              >
                {t(label)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Field List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t(ENTITIES.find((e) => e.key === selectedEntity)?.label ?? '')}{' '}
              {t('settings.customFields.fieldsFor')}
            </CardTitle>
            <Button size="sm" onClick={openCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t('settings.customFields.addField')}
            </Button>
          </div>
          <div className="relative mt-2">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('settings.customFields.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : fields.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('settings.customFields.emptyState')}
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => {
                const typeConfig = FIELD_TYPE_CONFIG[field.type];
                const TypeIcon = typeConfig?.icon ?? Type;
                return (
                  <div
                    key={field._id}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      field.isActive ? 'bg-card' : 'border-dashed bg-muted/30 opacity-60'
                    }`}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.label.en}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {field.fieldKey}
                        </code>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {t(typeConfig?.label ?? field.type)}
                        </Badge>
                        {field.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            {t('settings.customFields.required')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={field.isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(field)}
                        disabled={toggleMutation.isPending}
                      >
                        {field.isActive ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Edit"
                        onClick={() => openEdit(field)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Delete"
                        onClick={() => setDeleteTarget(field)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inline Create/Edit Form */}
      {formOpen && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingField
                ? t('settings.customFields.editField')
                : t('settings.customFields.newField')}
            </CardTitle>
            <CardDescription>
              {editingField
                ? t('settings.customFields.form.editingDescription', {
                    fieldName: editingField.label.en,
                  })
                : t('settings.customFields.form.addingDescription', {
                    entityName: t(ENTITIES.find((e) => e.key === selectedEntity)?.label ?? ''),
                  })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Key + Type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cf-key">{t('settings.customFields.form.fieldKey')}</Label>
                <Input
                  id="cf-key"
                  value={form.fieldKey}
                  onChange={(e) => setForm({ ...form, fieldKey: e.target.value })}
                  placeholder={t('settings.customFields.form.fieldKeyPlaceholder')}
                  disabled={!!editingField}
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.customFields.form.fieldKeyHint')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-type">{t('settings.customFields.form.fieldType')}</Label>
                <select
                  id="cf-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  disabled={!!editingField}
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.key} value={ft.key}>
                      {t(ft.label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Labels */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cf-label-en">{t('settings.customFields.form.labelEn')}</Label>
                <Input
                  id="cf-label-en"
                  value={form.labelEn}
                  onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
                  placeholder="e.g. Blood Type"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-label-ar">{t('settings.customFields.form.labelAr')}</Label>
                <Input
                  id="cf-label-ar"
                  value={form.labelAr}
                  onChange={(e) => setForm({ ...form, labelAr: e.target.value })}
                  placeholder="e.g. فصيلة الدم"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Row 3: Descriptions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cf-desc-en">{t('settings.customFields.form.descriptionEn')}</Label>
                <Input
                  id="cf-desc-en"
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-desc-ar">{t('settings.customFields.form.descriptionAr')}</Label>
                <Input
                  id="cf-desc-ar"
                  value={form.descriptionAr}
                  onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Row 4: Toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isRequired}
                  onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                />
                {t('settings.customFields.form.required')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                {t('settings.customFields.form.active')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.showInList}
                  onChange={(e) => setForm({ ...form, showInList: e.target.checked })}
                />
                {t('settings.customFields.form.showInList')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.showInForm}
                  onChange={(e) => setForm({ ...form, showInForm: e.target.checked })}
                />
                {t('settings.customFields.form.showInForm')}
              </label>
            </div>

            {/* Row 5: Default Value + Sort Order */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cf-default">{t('settings.customFields.form.defaultValue')}</Label>
                <Input
                  id="cf-default"
                  value={form.defaultValue}
                  onChange={(e) => setForm({ ...form, defaultValue: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cf-sort">{t('settings.customFields.form.sortOrder')}</Label>
                <Input
                  id="cf-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>

            {/* Select/Multiselect Options */}
            {isSelectType && (
              <div className="space-y-3">
                <Label>{t('settings.customFields.options.title')}</Label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder={t('settings.customFields.options.value')}
                      value={opt.value}
                      onChange={(e) => {
                        const updated = [...form.options];
                        updated[i] = { ...opt, value: e.target.value };
                        setForm({ ...form, options: updated });
                      }}
                      className="w-28"
                    />
                    <Input
                      placeholder={t('settings.customFields.options.labelEn')}
                      value={opt.labelEn}
                      onChange={(e) => {
                        const updated = [...form.options];
                        updated[i] = { ...opt, labelEn: e.target.value };
                        setForm({ ...form, options: updated });
                      }}
                    />
                    <Input
                      placeholder={t('settings.customFields.options.labelAr')}
                      value={opt.labelAr}
                      onChange={(e) => {
                        const updated = [...form.options];
                        updated[i] = { ...opt, labelAr: e.target.value };
                        setForm({ ...form, options: updated });
                      }}
                      dir="rtl"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => {
                        setForm({
                          ...form,
                          options: form.options.filter((_, idx) => idx !== i),
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      options: [...form.options, { value: '', labelEn: '', labelAr: '' }],
                    })
                  }
                >
                  <Plus className="me-1 h-3.5 w-3.5" />
                  {t('settings.customFields.options.addOption')}
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeForm}>
                {t('settings.customFields.actions.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !form.labelEn || !form.fieldKey}>
                {isSaving
                  ? t('settings.customFields.actions.saving')
                  : editingField
                    ? t('settings.customFields.actions.updateField')
                    : t('settings.customFields.actions.createField')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('settings.customFields.deleteDialog.title')}
        description={t('settings.customFields.deleteDialog.description', {
          fieldName: deleteTarget?.label.en ?? '',
        })}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
