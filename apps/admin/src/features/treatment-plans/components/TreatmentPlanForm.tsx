import { useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createTreatmentPlanSchema, type CreateTreatmentPlanInput } from '@dento/shared';
import {
  Button,
  FormField,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  SearchCombobox,
  Separator,
} from '@dento/ui';
import { ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useServiceList, type Service } from '@/features/services/hooks/useServices.js';

interface TreatmentPlanFormProps {
  defaultValues?: Partial<CreateTreatmentPlanInput>;
  onSubmit: (data: CreateTreatmentPlanInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

export function TreatmentPlanForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: TreatmentPlanFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateTreatmentPlanInput>({
    resolver: zodFormResolver(createTreatmentPlanSchema),
    defaultValues: {
      status: 'draft',
      items: [],
      linkedXrays: [],
      linkedCbcts: [],
      totalCost: 0,
      discountValue: 0,
      finalCost: 0,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'firstName.en',
    sortOrder: 'asc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: serviceData } = useServiceList({ page: 1, limit: 100, isActive: true });

  const patientOptions = useMemo(
    () =>
      (patientData?.patients ?? []).map((p) => ({
        value: p._id,
        label: `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode,
        description: p.phone || p.email || p.patientCode,
      })),
    [patientData],
  );

  const doctorOptions = useMemo(
    () =>
      (doctorData?.items ?? []).map((d) => ({
        value: d._id,
        label: `${d.firstName} ${d.lastName}`.trim(),
        description: d.specialization,
      })),
    [doctorData],
  );

  const serviceOptions = useMemo(
    () =>
      ((serviceData?.items ?? []) as Service[]).map((s) => ({
        value: s._id,
        label: s.name.en,
        description: s.code ? `${s.code} — $${s.defaultPrice}` : `$${s.defaultPrice}`,
        price: s.defaultPrice,
        name: s.name.en,
      })),
    [serviceData],
  );

  // FDI adult teeth: 11-18, 21-28, 31-38, 41-48
  const toothOptions = useMemo(() => {
    const teeth: { value: string; label: string }[] = [];
    for (const quad of [1, 2, 3, 4]) {
      for (let t = 1; t <= 8; t++) {
        const num = quad * 10 + t;
        teeth.push({ value: String(num), label: `#${num}` });
      }
    }
    return teeth;
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {mode === 'create'
            ? t('treatmentPlans.form.newTitle')
            : t('treatmentPlans.form.editTitle')}
        </DialogTitle>
      </DialogHeader>

      {/* Patient & Doctor */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label={t('treatmentPlans.form.patient')}
          error={errors.patientId?.message}
          required
        >
          <Controller
            control={control}
            name="patientId"
            render={({ field }) => (
              <SearchCombobox
                options={patientOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Select patient…"
                searchPlaceholder="Search patients…"
                emptyMessage="No patients found."
              />
            )}
          />
        </FormField>
        <FormField
          label={t('treatmentPlans.form.doctor')}
          error={errors.doctorId?.message}
          required
        >
          <Controller
            control={control}
            name="doctorId"
            render={({ field }) => (
              <SearchCombobox
                options={doctorOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder="Select doctor…"
                searchPlaceholder="Search doctors…"
                emptyMessage="No doctors found."
              />
            )}
          />
        </FormField>
      </div>

      {/* Title */}
      <FormField label={t('treatmentPlans.form.title')} error={errors.title?.message} required>
        <Input placeholder="e.g. Root canal + crown — Tooth #14" {...register('title')} />
      </FormField>

      {/* Description */}
      <FormField label={t('treatmentPlans.form.description')} error={errors.description?.message}>
        <Textarea placeholder="Plan description…" rows={3} {...register('description')} />
      </FormField>

      <Separator />

      {/* Treatment Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            {t('treatmentPlans.form.treatmentItems')} ({fields.length})
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                procedureName: '',
                toothNumber: '',
                surface: '',
                cost: 0,
                sequenceOrder: fields.length,
                status: 'pending',
                linkedXrays: [],
                linkedCbcts: [],
                requiredImaging: [],
                materials: [],
              })
            }
          >
            <Plus className="me-1.5 h-3.5 w-3.5" />
            {t('treatmentPlans.form.addItem')}
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('treatmentPlans.form.noItemsHint')}
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-start border rounded-md p-3"
          >
            {/* Service / Procedure Name */}
            <div className="space-y-2">
              <FormField
                label={t('treatmentPlans.form.service')}
                error={errors.items?.[index]?.procedureName?.message}
              >
                <Controller
                  control={control}
                  name={`items.${index}.serviceId`}
                  render={({ field: f }) => (
                    <SearchCombobox
                      options={serviceOptions}
                      value={f.value ?? ''}
                      onValueChange={(val) => {
                        f.onChange(val);
                        const svc = serviceOptions.find((s) => s.value === val);
                        if (svc) {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const setValue = (control as any)._formValues;
                          if (setValue) {
                            // Let react-hook-form handle via register
                          }
                        }
                      }}
                      placeholder="Select service…"
                      searchPlaceholder="Search…"
                      emptyMessage="No services."
                    />
                  )}
                />
              </FormField>
              <Input
                placeholder={t('treatmentPlans.form.procedureName')}
                {...register(`items.${index}.procedureName`)}
              />
            </div>

            {/* Tooth Number */}
            <FormField
              label={t('treatmentPlans.form.tooth')}
              error={errors.items?.[index]?.toothNumber?.message}
            >
              <Controller
                control={control}
                name={`items.${index}.toothNumber`}
                render={({ field: f }) => (
                  <Select value={f.value ?? ''} onValueChange={f.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {toothOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Cost */}
            <FormField
              label={t('treatmentPlans.form.cost')}
              error={errors.items?.[index]?.cost?.message}
            >
              <Input
                type="number"
                min={0}
                {...register(`items.${index}.cost`, {
                  setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)),
                })}
              />
            </FormField>

            {/* Remove */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      {/* Discount & Valid Until */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          label={t('treatmentPlans.form.discountType')}
          error={errors.discountType?.message}
        >
          <Controller
            control={control}
            name="discountType"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t('treatmentPlans.form.percentage')}</SelectItem>
                  <SelectItem value="fixed">{t('treatmentPlans.form.fixed')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label={t('treatmentPlans.form.discountValue')}
          error={errors.discountValue?.message}
        >
          <Input
            type="number"
            min={0}
            {...register('discountValue', {
              setValueAs: (v) => (v === '' || v == null ? 0 : Number(v)),
            })}
          />
        </FormField>
        <FormField label={t('treatmentPlans.form.validUntil')} error={errors.validUntil?.message}>
          <Input type="date" {...register('validUntil')} />
        </FormField>
      </div>

      {/* Notes */}
      <FormField label={t('treatmentPlans.form.notes')} error={errors.notes?.message}>
        <Textarea
          placeholder={t('treatmentPlans.form.notesPlaceholder')}
          rows={2}
          {...register('notes')}
        />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create'
            ? t('treatmentPlans.form.createPlan')
            : t('treatmentPlans.form.saveChanges')}
        </Button>
      </DialogFooter>
    </form>
  );
}
