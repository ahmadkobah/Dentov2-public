/**
 * CustomFieldForm — Create/Edit sheet for custom field definitions
 *
 * Per PHASE_7_IMPLEMENTATION_PLAN Step 1.4
 * Full form with type selector, bilingual labels, select options management,
 * validation config, and visibility toggles.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Separator,
  Badge,
} from '@dento/ui';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type {
  CustomField,
  CustomFieldType,
  CustomFieldEntity,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
} from '@dento/shared';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string; description: string }> = [
  { value: 'text', label: 'Text', description: 'Single-line text input' },
  { value: 'textarea', label: 'Textarea', description: 'Multi-line text area' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'boolean', label: 'Boolean', description: 'Yes / No toggle' },
  { value: 'select', label: 'Select', description: 'Single-choice dropdown' },
  { value: 'multiselect', label: 'Multi-Select', description: 'Multiple-choice dropdown' },
  { value: 'email', label: 'Email', description: 'Email address input' },
  { value: 'phone', label: 'Phone', description: 'Phone number input' },
  { value: 'url', label: 'URL', description: 'Web URL input' },
];

const ENTITY_OPTIONS: Array<{ value: CustomFieldEntity; label: string }> = [
  { value: 'patient', label: 'Patient' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'treatment_plan', label: 'Treatment Plan' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_order', label: 'Lab Order' },
];

const TYPES_WITH_OPTIONS: CustomFieldType[] = ['select', 'multiselect'];

/* ------------------------------------------------------------------ */
/*  Validation schema (flat form state)                                */
/* ------------------------------------------------------------------ */

const customFieldFormSchema = z
  .object({
    entity: z.enum([
      'patient',
      'appointment',
      'invoice',
      'treatment_plan',
      'prescription',
      'lab_order',
    ]),
    fieldKey: z
      .string()
      .min(1, 'Field key is required')
      .regex(
        /^[a-z][a-zA-Z0-9_]*$/,
        'Must start with lowercase letter, only letters/numbers/underscores',
      ),
    labelEn: z.string().min(1, 'Label (English) is required'),
    labelAr: z.string(),
    descEn: z.string(),
    descAr: z.string(),
    type: z.enum([
      'text',
      'textarea',
      'number',
      'date',
      'boolean',
      'select',
      'multiselect',
      'email',
      'phone',
      'url',
    ]),
    isRequired: z.boolean(),
    defaultValue: z.string(),
    placeholderEn: z.string(),
    placeholderAr: z.string(),
    options: z.array(
      z.object({ labelEn: z.string(), labelAr: z.string(), value: z.string(), color: z.string() }),
    ),
    validationMin: z.string(),
    validationMax: z.string(),
    validationMinLength: z.string(),
    validationMaxLength: z.string(),
    validationPattern: z.string(),
    validationPatternMsg: z.string(),
    isActive: z.boolean(),
    sortOrder: z.string(),
    showInList: z.boolean(),
    showInForm: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (['select', 'multiselect'].includes(data.type) && data.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one option is required',
        path: ['options'],
      });
    }
  });

type FormState = z.infer<typeof customFieldFormSchema>;

function emptyForm(entity: CustomFieldEntity): FormState {
  return {
    entity,
    fieldKey: '',
    labelEn: '',
    labelAr: '',
    descEn: '',
    descAr: '',
    type: 'text',
    isRequired: false,
    defaultValue: '',
    placeholderEn: '',
    placeholderAr: '',
    options: [],
    validationMin: '',
    validationMax: '',
    validationMinLength: '',
    validationMaxLength: '',
    validationPattern: '',
    validationPatternMsg: '',
    isActive: true,
    sortOrder: '0',
    showInList: false,
    showInForm: true,
  };
}

function fieldToForm(field: CustomField): FormState {
  return {
    entity: field.entity,
    fieldKey: field.fieldKey,
    labelEn: field.label.en,
    labelAr: field.label.ar ?? '',
    descEn: field.description?.en ?? '',
    descAr: field.description?.ar ?? '',
    type: field.type,
    isRequired: field.isRequired,
    defaultValue: field.defaultValue != null ? String(field.defaultValue) : '',
    placeholderEn: field.placeholder?.en ?? '',
    placeholderAr: field.placeholder?.ar ?? '',
    options: (field.options ?? []).map((o) => ({
      labelEn: o.label.en,
      labelAr: o.label.ar ?? '',
      value: o.value,
      color: o.color ?? '',
    })),
    validationMin: field.validation?.min != null ? String(field.validation.min) : '',
    validationMax: field.validation?.max != null ? String(field.validation.max) : '',
    validationMinLength:
      field.validation?.minLength != null ? String(field.validation.minLength) : '',
    validationMaxLength:
      field.validation?.maxLength != null ? String(field.validation.maxLength) : '',
    validationPattern: field.validation?.pattern ?? '',
    validationPatternMsg: field.validation?.patternMessage ?? '',
    isActive: field.isActive,
    sortOrder: String(field.sortOrder),
    showInList: field.showInList,
    showInForm: field.showInForm,
  };
}

function formToCreateInput(form: FormState): CreateCustomFieldInput {
  const input: CreateCustomFieldInput = {
    entity: form.entity,
    fieldKey: form.fieldKey,
    label: { en: form.labelEn, ...(form.labelAr && { ar: form.labelAr }) },
    type: form.type,
    isRequired: form.isRequired,
    isActive: form.isActive,
    sortOrder: parseInt(form.sortOrder, 10) || 0,
    showInList: form.showInList,
    showInForm: form.showInForm,
  };

  if (form.descEn || form.descAr) {
    input.description = {
      ...(form.descEn && { en: form.descEn }),
      ...(form.descAr && { ar: form.descAr }),
    };
  }

  if (form.defaultValue) {
    input.defaultValue = form.defaultValue;
  }

  if (form.placeholderEn || form.placeholderAr) {
    input.placeholder = {
      ...(form.placeholderEn && { en: form.placeholderEn }),
      ...(form.placeholderAr && { ar: form.placeholderAr }),
    };
  }

  if (TYPES_WITH_OPTIONS.includes(form.type) && form.options.length > 0) {
    input.options = form.options.map((o) => ({
      label: { en: o.labelEn, ...(o.labelAr && { ar: o.labelAr }) },
      value: o.value,
      ...(o.color && { color: o.color }),
    }));
  }

  const validation: Record<string, unknown> = {};
  if (form.validationMin) validation.min = Number(form.validationMin);
  if (form.validationMax) validation.max = Number(form.validationMax);
  if (form.validationMinLength) validation.minLength = Number(form.validationMinLength);
  if (form.validationMaxLength) validation.maxLength = Number(form.validationMaxLength);
  if (form.validationPattern) validation.pattern = form.validationPattern;
  if (form.validationPatternMsg) validation.patternMessage = form.validationPatternMsg;
  if (Object.keys(validation).length > 0) {
    input.validation = validation as CreateCustomFieldInput['validation'];
  }

  return input;
}

function formToUpdateInput(form: FormState): UpdateCustomFieldInput {
  const input: UpdateCustomFieldInput = {
    label: { en: form.labelEn, ...(form.labelAr && { ar: form.labelAr }) },
    isRequired: form.isRequired,
    isActive: form.isActive,
    sortOrder: parseInt(form.sortOrder, 10) || 0,
    showInList: form.showInList,
    showInForm: form.showInForm,
  };

  if (form.descEn || form.descAr) {
    input.description = {
      ...(form.descEn && { en: form.descEn }),
      ...(form.descAr && { ar: form.descAr }),
    };
  }

  if (form.defaultValue) {
    input.defaultValue = form.defaultValue;
  }

  if (form.placeholderEn || form.placeholderAr) {
    input.placeholder = {
      ...(form.placeholderEn && { en: form.placeholderEn }),
      ...(form.placeholderAr && { ar: form.placeholderAr }),
    };
  }

  if (TYPES_WITH_OPTIONS.includes(form.type) && form.options.length > 0) {
    input.options = form.options.map((o) => ({
      label: { en: o.labelEn, ...(o.labelAr && { ar: o.labelAr }) },
      value: o.value,
      ...(o.color && { color: o.color }),
    }));
  }

  const validation: Record<string, unknown> = {};
  if (form.validationMin) validation.min = Number(form.validationMin);
  if (form.validationMax) validation.max = Number(form.validationMax);
  if (form.validationMinLength) validation.minLength = Number(form.validationMinLength);
  if (form.validationMaxLength) validation.maxLength = Number(form.validationMaxLength);
  if (form.validationPattern) validation.pattern = form.validationPattern;
  if (form.validationPatternMsg) validation.patternMessage = form.validationPatternMsg;
  if (Object.keys(validation).length > 0) {
    input.validation = validation as UpdateCustomFieldInput['validation'];
  }

  return input;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CustomFieldFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingField: CustomField | null;
  selectedEntity: CustomFieldEntity;
  onSubmit: (data: CreateCustomFieldInput | (UpdateCustomFieldInput & { id: string })) => void;
  isSubmitting: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CustomFieldForm({
  open,
  onOpenChange,
  editingField,
  selectedEntity,
  onSubmit,
  isSubmitting,
}: CustomFieldFormProps) {
  const isEditing = !!editingField;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FormState>({
    resolver: zodFormResolver(customFieldFormSchema),
    defaultValues: editingField ? fieldToForm(editingField) : emptyForm(selectedEntity),
    mode: 'onChange',
  });

  // Reset form when opening/switching modes
  useEffect(() => {
    if (open) {
      reset(editingField ? fieldToForm(editingField) : emptyForm(selectedEntity));
    }
  }, [open, editingField, selectedEntity, reset]);

  // Watched values for controlled components
  const entity = watch('entity');
  const type = watch('type');
  const options = watch('options');
  const isRequired = watch('isRequired');
  const showInList = watch('showInList');
  const showInForm = watch('showInForm');
  const isActive = watch('isActive');

  const hasOptions = TYPES_WITH_OPTIONS.includes(type);

  const addOption = () => {
    setValue('options', [...options, { labelEn: '', labelAr: '', value: '', color: '' }], {
      shouldValidate: true,
    });
  };
  const removeOption = (index: number) => {
    setValue(
      'options',
      options.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  };
  const updateOption = (index: number, key: keyof FormState['options'][number], value: string) => {
    setValue(
      'options',
      options.map((opt, i) => (i === index ? { ...opt, [key]: value } : opt)),
      { shouldValidate: true },
    );
  };

  const onFormSubmit = (data: FormState) => {
    if (isEditing && editingField) {
      onSubmit({ ...formToUpdateInput(data), id: editingField._id });
    } else {
      onSubmit(formToCreateInput(data));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit Custom Field' : 'Create Custom Field'}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editing "${editingField.label.en}" in ${editingField.entity}`
              : `Add a new custom field for ${selectedEntity.replace('_', ' ')}`}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="mt-6 space-y-6">
          {/* ── Entity + Type ──────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-entity">Entity</Label>
              <Select
                value={entity}
                onValueChange={(v) =>
                  setValue('entity', v as CustomFieldEntity, { shouldValidate: true })
                }
                disabled={isEditing}
              >
                <SelectTrigger id="cf-entity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-type">Field Type</Label>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue('type', v as CustomFieldType, { shouldValidate: true })
                }
                disabled={isEditing}
              >
                <SelectTrigger id="cf-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span>{t.label}</span>
                        <span className="ms-2 text-xs text-gray-500">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Field Key ──────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="cf-key">
              Field Key <span className="text-xs text-gray-500">(camelCase, immutable)</span>
            </Label>
            <Input
              id="cf-key"
              {...register('fieldKey')}
              placeholder="e.g. bloodType, insuranceId"
              disabled={isEditing}
            />
            {errors.fieldKey && <p className="text-xs text-red-600">{errors.fieldKey.message}</p>}
          </div>

          {/* ── Labels (bilingual) ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-label-en">Label (English) *</Label>
              <Input id="cf-label-en" {...register('labelEn')} placeholder="Blood Type" />
              {errors.labelEn && <p className="text-xs text-red-600">{errors.labelEn.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-label-ar">Label (Arabic)</Label>
              <Input id="cf-label-ar" {...register('labelAr')} placeholder="فصيلة الدم" dir="rtl" />
            </div>
          </div>

          {/* ── Description (bilingual) ────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-desc-en">Description (EN)</Label>
              <Textarea
                id="cf-desc-en"
                {...register('descEn')}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-desc-ar">Description (AR)</Label>
              <Textarea
                id="cf-desc-ar"
                {...register('descAr')}
                placeholder="وصف اختياري"
                dir="rtl"
                rows={2}
              />
            </div>
          </div>

          {/* ── Placeholder (bilingual) ────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-ph-en">Placeholder (EN)</Label>
              <Input id="cf-ph-en" {...register('placeholderEn')} placeholder="Enter value…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-ph-ar">Placeholder (AR)</Label>
              <Input
                id="cf-ph-ar"
                {...register('placeholderAr')}
                placeholder="أدخل القيمة…"
                dir="rtl"
              />
            </div>
          </div>

          <Separator />

          {/* ── Select Options (conditional) ───────────────── */}
          {hasOptions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Options{' '}
                  <Badge variant="secondary" className="ms-1 text-xs">
                    {options.length}
                  </Badge>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="me-1 h-3 w-3" />
                  Add Option
                </Button>
              </div>
              {options.length === 0 && (
                <p className="text-xs text-amber-600">
                  At least one option is required for {type} fields.
                </p>
              )}
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 shrink-0 text-gray-400" />
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(i, 'value', e.target.value)}
                      placeholder="value"
                      className="w-24"
                    />
                    <Input
                      value={opt.labelEn}
                      onChange={(e) => updateOption(i, 'labelEn', e.target.value)}
                      placeholder="Label (EN)"
                      className="flex-1"
                    />
                    <Input
                      value={opt.labelAr}
                      onChange={(e) => updateOption(i, 'labelAr', e.target.value)}
                      placeholder="(AR)"
                      className="w-24"
                      dir="rtl"
                    />
                    <Input
                      value={opt.color}
                      onChange={(e) => updateOption(i, 'color', e.target.value)}
                      placeholder="#hex"
                      className="w-20"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(i)}
                      className="shrink-0 text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Toggles ────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Required</Label>
                <p className="text-xs text-gray-500">Users must fill this field</p>
              </div>
              <Switch
                checked={isRequired}
                onCheckedChange={(v) => setValue('isRequired', v, { shouldValidate: true })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show in List</Label>
                <p className="text-xs text-gray-500">Display as a column in table views</p>
              </div>
              <Switch
                checked={showInList}
                onCheckedChange={(v) => setValue('showInList', v, { shouldValidate: true })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Show in Form</Label>
                <p className="text-xs text-gray-500">Display in create/edit forms</p>
              </div>
              <Switch
                checked={showInForm}
                onCheckedChange={(v) => setValue('showInForm', v, { shouldValidate: true })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-gray-500">Inactive fields are hidden from users</p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue('isActive', v, { shouldValidate: true })}
              />
            </div>
          </div>

          <Separator />

          {/* ── Validation Rules ───────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Validation Rules</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cf-val-min" className="text-xs">
                  Min Value
                </Label>
                <Input
                  id="cf-val-min"
                  type="number"
                  {...register('validationMin')}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cf-val-max" className="text-xs">
                  Max Value
                </Label>
                <Input
                  id="cf-val-max"
                  type="number"
                  {...register('validationMax')}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cf-val-minlen" className="text-xs">
                  Min Length
                </Label>
                <Input
                  id="cf-val-minlen"
                  type="number"
                  {...register('validationMinLength')}
                  placeholder="—"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cf-val-maxlen" className="text-xs">
                  Max Length
                </Label>
                <Input
                  id="cf-val-maxlen"
                  type="number"
                  {...register('validationMaxLength')}
                  placeholder="—"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cf-val-pattern" className="text-xs">
                Regex Pattern
              </Label>
              <Input
                id="cf-val-pattern"
                {...register('validationPattern')}
                placeholder="e.g. ^[A-Z]{2}$"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cf-val-pattern-msg" className="text-xs">
                Pattern Error Message
              </Label>
              <Input
                id="cf-val-pattern-msg"
                {...register('validationPatternMsg')}
                placeholder="Must be 2 uppercase letters"
              />
            </div>
          </div>

          {/* ── Default Value + Sort Order ─────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cf-default">Default Value</Label>
              <Input id="cf-default" {...register('defaultValue')} placeholder="Optional default" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cf-sort">Sort Order</Label>
              <Input id="cf-sort" type="number" {...register('sortOrder')} min={0} />
            </div>
          </div>
          <SheetFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Saving…'
                  : 'Creating…'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Field'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
