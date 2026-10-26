import { useMemo, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createProcedureNoteSchema, type CreateProcedureNoteInput } from '@dento/shared';
import {
  Button,
  FormField,
  Input,
  Textarea,
  Switch,
  Label,
  Badge,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Dialog,
  DialogContent,
  SearchCombobox,
  MultiSelectCombobox,
} from '@dento/ui';
import { FileText, Loader2, X } from 'lucide-react';
import { Odontogram, type ToothDetail } from 'react-odontogram';
import 'react-odontogram/style.css';
import { useThemeStore } from '@/stores/theme.store.js';
import { useTranslation } from '@/stores/locale.store.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useServiceList } from '@/features/services/hooks/useServices.js';
import { useInventoryItemList } from '@/features/inventory/hooks/useInventoryItems.js';

interface ProcedureNoteFormProps {
  defaultValues?: Partial<CreateProcedureNoteInput>;
  onSubmit: (data: CreateProcedureNoteInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

export function ProcedureNoteForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: ProcedureNoteFormProps) {
  const isDark = useThemeStore((s) => s.isDark);
  const { t } = useTranslation();
  const [showToothPicker, setShowToothPicker] = useState(false);
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    defaultValues?.teethInvolved
      ? defaultValues.teethInvolved
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

  // Track multiple service/procedure selections
  const [servicesList, setServicesList] = useState<string[]>(
    defaultValues?.procedureName
      ? defaultValues.procedureName
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

  // Track multiple material/anesthesia selections
  const [materialsList, setMaterialsList] = useState<string[]>(
    defaultValues?.materialsUsed
      ? defaultValues.materialsUsed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );
  const [anesthesiaList, setAnesthesiaList] = useState<string[]>(
    defaultValues?.anesthesiaUsed
      ? defaultValues.anesthesiaUsed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProcedureNoteInput>({
    resolver: zodFormResolver(createProcedureNoteSchema),
    defaultValues: {
      status: 'draft',
      followUpRequired: false,
      linkedXrays: [],
      linkedCbcts: [],
      preOpXrays: [],
      postOpXrays: [],
      attachments: [],
      ...defaultValues,
    },
  });

  // ── Data Fetching ──────────────────────────────────────
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'firstName.en',
    sortOrder: 'asc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: serviceData } = useServiceList({ page: 1, limit: 100, isActive: true });
  const { data: inventoryData } = useInventoryItemList({ page: 1, limit: 100, isActive: 'true' });

  // ── Options ────────────────────────────────────────────
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
      (serviceData?.items ?? []).map((s) => ({
        value: s.name.en,
        label: s.name.en,
        description: s.code ? `${s.code} — ${s.defaultDuration}min` : `${s.defaultDuration}min`,
      })),
    [serviceData],
  );

  const inventoryOptions = useMemo(
    () =>
      (inventoryData?.items ?? []).map((item) => ({
        value: item.name.en,
        label: item.name.en,
        description: `${item.sku} — ${item.unitOfMeasure}`,
      })),
    [inventoryData],
  );

  const followUpRequired = watch('followUpRequired');

  // ── Tooth Picker ───────────────────────────────────────
  const handleToothChange = useCallback(
    (selected: ToothDetail[]) => {
      queueMicrotask(() => {
        const teeth = selected.map((td) => td.notations.fdi);
        setSelectedTeeth(teeth);
        setValue('teethInvolved', teeth.join(', '));
      });
    },
    [setValue],
  );

  const removeTooth = (tooth: string) => {
    const updated = selectedTeeth.filter((t) => t !== tooth);
    setSelectedTeeth(updated);
    setValue('teethInvolved', updated.join(', '));
  };

  // ── Service / Procedure helpers ────────────────────────
  // ── Material / Anesthesia helpers ──────────────────────
  const addMaterial = (name: string) => {
    if (!name || materialsList.includes(name)) return;
    const updated = [...materialsList, name];
    setMaterialsList(updated);
    setValue('materialsUsed', updated.join(', '));
  };

  const removeMaterial = (name: string) => {
    const updated = materialsList.filter((m) => m !== name);
    setMaterialsList(updated);
    setValue('materialsUsed', updated.join(', '));
  };

  const addAnesthesia = (name: string) => {
    if (!name || anesthesiaList.includes(name)) return;
    const updated = [...anesthesiaList, name];
    setAnesthesiaList(updated);
    setValue('anesthesiaUsed', updated.join(', '));
  };

  const removeAnesthesia = (name: string) => {
    const updated = anesthesiaList.filter((a) => a !== name);
    setAnesthesiaList(updated);
    setValue('anesthesiaUsed', updated.join(', '));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {mode === 'create' ? t('procedureNotes.create.title') : t('procedureNotes.edit.title')}
        </DialogTitle>
      </DialogHeader>

      {/* Patient & Doctor */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label={t('procedureNotes.form.patient')}
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
                placeholder={t('procedureNotes.form.selectPatient')}
                searchPlaceholder={t('procedureNotes.form.searchPatients')}
                emptyMessage={t('procedureNotes.form.noPatients')}
              />
            )}
          />
        </FormField>
        <FormField
          label={t('procedureNotes.form.doctor')}
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
                placeholder={t('procedureNotes.form.selectDoctor')}
                searchPlaceholder={t('procedureNotes.form.searchDoctors')}
                emptyMessage={t('procedureNotes.form.noDoctors')}
              />
            )}
          />
        </FormField>
      </div>

      {/* Service / Procedure — multi-select from Services */}
      <FormField
        label={t('procedureNotes.form.serviceProcedure')}
        error={errors.procedureName?.message}
        required
      >
        <MultiSelectCombobox
          options={serviceOptions}
          values={servicesList}
          onValuesChange={(vals) => {
            setServicesList(vals);
            setValue('procedureName', vals.join(', '));
            const svc = serviceData?.items?.find((s) => s.name.en === vals[0]);
            setValue('serviceId', svc?._id ?? '');
          }}
          placeholder={t('procedureNotes.form.selectServices')}
          searchPlaceholder={t('procedureNotes.form.searchServices')}
          emptyMessage={t('procedureNotes.form.noServices')}
        />
        <input type="hidden" {...register('procedureName')} />
      </FormField>

      {/* Teeth Involved — Dental Chart Picker */}
      <FormField
        label={t('procedureNotes.form.teethInvolved')}
        error={errors.teethInvolved?.message}
      >
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowToothPicker(true)}
          >
            {selectedTeeth.length > 0
              ? t('procedureNotes.form.teethSelected', { count: selectedTeeth.length })
              : t('procedureNotes.form.selectTeeth')}
          </Button>
          {selectedTeeth.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedTeeth.map((tooth) => (
                <Badge key={tooth} variant="secondary" className="gap-1">
                  #{tooth}
                  <button
                    type="button"
                    onClick={() => removeTooth(tooth)}
                    className="ms-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {/* Hidden field for form value */}
          <input type="hidden" {...register('teethInvolved')} />
        </div>
      </FormField>

      {/* Procedure Details */}
      <FormField
        label={t('procedureNotes.form.procedurePerformed')}
        error={errors.procedurePerformed?.message}
      >
        <Textarea
          placeholder={t('procedureNotes.form.procedureDetailsPlaceholder')}
          rows={3}
          {...register('procedurePerformed')}
        />
      </FormField>

      {/* Materials Used — select from Inventory */}
      <FormField
        label={t('procedureNotes.form.materialsUsed')}
        error={errors.materialsUsed?.message}
      >
        <div className="space-y-2">
          <SearchCombobox
            options={inventoryOptions.filter((o) => !materialsList.includes(o.value))}
            value=""
            onValueChange={(val) => addMaterial(val)}
            placeholder={t('procedureNotes.form.addMaterial')}
            searchPlaceholder={t('procedureNotes.form.searchInventory')}
            emptyMessage={t('procedureNotes.form.noItems')}
          />
          {materialsList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {materialsList.map((m) => (
                <Badge key={m} variant="secondary" className="gap-1">
                  {m}
                  <button
                    type="button"
                    onClick={() => removeMaterial(m)}
                    className="ms-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <input type="hidden" {...register('materialsUsed')} />
        </div>
      </FormField>

      {/* Anesthesia Used — select from Inventory */}
      <FormField
        label={t('procedureNotes.entry.anesthesiaUsed')}
        error={errors.anesthesiaUsed?.message}
      >
        <div className="space-y-2">
          <SearchCombobox
            options={inventoryOptions.filter((o) => !anesthesiaList.includes(o.value))}
            value=""
            onValueChange={(val) => addAnesthesia(val)}
            placeholder={t('procedureNotes.form.addAnesthesia')}
            searchPlaceholder={t('procedureNotes.form.searchInventory')}
            emptyMessage={t('procedureNotes.form.noItems')}
          />
          {anesthesiaList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {anesthesiaList.map((a) => (
                <Badge key={a} variant="secondary" className="gap-1">
                  {a}
                  <button
                    type="button"
                    onClick={() => removeAnesthesia(a)}
                    className="ms-1 rounded-full hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <input type="hidden" {...register('anesthesiaUsed')} />
        </div>
      </FormField>

      {/* Complications */}
      <FormField
        label={t('procedureNotes.form.complications')}
        error={errors.complications?.message}
      >
        <Textarea
          placeholder={t('procedureNotes.form.complicationsPlaceholder')}
          rows={2}
          {...register('complications')}
        />
      </FormField>

      {/* Post-Op */}
      <FormField
        label={t('procedureNotes.form.postOpInstructions')}
        error={errors.postOpInstructions?.message}
      >
        <Textarea
          placeholder={t('procedureNotes.form.postOpPlaceholder')}
          rows={2}
          {...register('postOpInstructions')}
        />
      </FormField>

      {/* Follow-up */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="followUpRequired"
            render={({ field }) => (
              <Switch checked={field.value} onCheckedChange={field.onChange} id="followUp" />
            )}
          />
          <Label htmlFor="followUp">{t('procedureNotes.form.followUpRequired')}</Label>
        </div>
        {followUpRequired && (
          <FormField
            label={t('procedureNotes.form.followUpDate')}
            error={errors.followUpDate?.message}
          >
            <Input type="date" {...register('followUpDate')} />
          </FormField>
        )}
      </div>

      {/* Notes */}
      <FormField label={t('procedureNotes.form.notes')} error={errors.notes?.message}>
        <Textarea
          placeholder={t('procedureNotes.form.notesPlaceholder')}
          rows={2}
          {...register('notes')}
        />
      </FormField>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? t('procedureNotes.create.submit') : t('procedureNotes.edit.submit')}
        </Button>
      </DialogFooter>

      {/* ── Tooth Picker Dialog ── */}
      <Dialog open={showToothPicker} onOpenChange={setShowToothPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('procedureNotes.create.selectTeeth')}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-x-auto py-4">
            <Odontogram
              notation="FDI"
              theme={isDark ? 'dark' : 'light'}
              showLabels
              onChange={handleToothChange}
              defaultSelected={selectedTeeth}
              styles={{ maxWidth: '320px', width: '100%' }}
            />
          </div>
          {selectedTeeth.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {t('procedureNotes.create.selected')}{' '}
              {selectedTeeth.map((tooth) => `#${tooth}`).join(', ')}
            </p>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setShowToothPicker(false)}>
              {t('procedureNotes.create.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
