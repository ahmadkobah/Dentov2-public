/**
 * Appointment Form — RHF + Zod (§8.4).
 * Used for create / edit appointment dialogs.
 */

import { useMemo, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import {
  createAppointmentSchema,
  appointmentSourceEnum,
  type CreateAppointmentInput,
  type CreatePatientInput,
} from '@dento/shared';
import {
  Button,
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  Textarea,
  Switch,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  SearchCombobox,
  toast,
} from '@dento/ui';
import { CalendarDays, Loader2, UserPlus } from 'lucide-react';
import { usePatientList, useCreatePatient } from '@/features/patients/hooks/usePatients.js';
import { PatientForm } from '@/features/patients/components/PatientForm.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useBranchList, useBranchDetail } from '@/features/branches/hooks/useBranches.js';
import { useAppointmentTypeList } from '@/features/appointment-types/hooks/useAppointmentTypes.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Props ────────────────────────────────────────────── */

interface AppointmentFormProps {
  defaultValues?: Partial<CreateAppointmentInput>;
  onSubmit: (data: CreateAppointmentInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

/* ── Component ────────────────────────────────────────── */

export function AppointmentForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: AppointmentFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateAppointmentInput>({
    resolver: zodFormResolver(createAppointmentSchema),
    defaultValues: {
      durationMinutes: 30,
      // No default appointment type \u2014 user must explicitly pick one so the
      // associated default fee/duration are applied. Starting with
      // "consultation" pre-selected previously caused the fee to read as 0
      // until the user re-selected the type.
      type: '',
      source: 'admin',
      isWalkIn: false,
      ...defaultValues,
    },
  });

  // ── Fetch lookup data for comboboxes ──────────────────
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: branchData } = useBranchList({ page: 1, limit: 100, isActive: true });
  const { data: customTypes } = useAppointmentTypeList({ activeOnly: true });

  // Fetch selected branch details ((for chair options))
  const selectedBranchId = watch('branchId');
  const { data: selectedBranch } = useBranchDetail(selectedBranchId ?? '');

  // ── Inline patient creation ───────────────────────────
  const [showNewPatient, setShowNewPatient] = useState(false);
  const createPatientMutation = useCreatePatient();

  const handleCreatePatient = async (data: CreatePatientInput) => {
    try {
      const res = await createPatientMutation.mutateAsync(data);
      const newId = (res as { data: { patient: { _id: string } } }).data.patient._id;
      setValue('patientId', newId);
      setShowNewPatient(false);
      toast.success(t('appointments.toast.patientCreated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create patient';
      toast.error(message);
    }
  };

  // Split API types into default vs custom for grouped dropdown
  const defaultTypes = useMemo(() => (customTypes ?? []).filter((t) => t.isDefault), [customTypes]);
  const extraTypes = useMemo(() => (customTypes ?? []).filter((t) => !t.isDefault), [customTypes]);

  // ── Auto-calculate endTime from startTime + durationMinutes ──
  const watchedStartTime = watch('startTime');
  const watchedDuration = watch('durationMinutes');
  useEffect(() => {
    if (!watchedStartTime || !watchedDuration) return;
    const [h, m] = watchedStartTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return;
    const totalMin = h * 60 + m + watchedDuration;
    const endH = Math.floor(totalMin / 60) % 24;
    const endM = totalMin % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    setValue('endTime', endTime);
  }, [watchedStartTime, watchedDuration, setValue]);
  const chairOptions = useMemo(
    () =>
      (selectedBranch?.chairs ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({
          value: String(c.number),
          label: `Chair #${c.number}${c.name ? ` — ${c.name}` : ''}`,
        })),
    [selectedBranch],
  );

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

  const branchOptions = useMemo(
    () =>
      (branchData?.items ?? []).map((b) => ({
        value: b._id,
        label: b.name?.en ?? b.code,
        description: b.code,
      })),
    [branchData],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {mode === 'create' ? t('appointments.form.bookTitle') : t('appointments.form.editTitle')}
        </DialogTitle>
      </DialogHeader>

      {/* ── Patient / Doctor / Branch ─────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          label={t('appointments.form.patient')}
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
                placeholder={t('appointments.form.patientPlaceholder')}
                searchPlaceholder={t('appointments.form.patientSearch')}
                emptyMessage={t('appointments.form.patientEmpty')}
                footerAction={
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm"
                    onClick={() => setShowNewPatient(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('appointments.form.newPatient')}
                  </Button>
                }
              />
            )}
          />
        </FormField>
        <FormField label={t('appointments.form.doctor')} error={errors.doctorId?.message} required>
          <Controller
            control={control}
            name="doctorId"
            render={({ field }) => (
              <SearchCombobox
                options={doctorOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t('appointments.form.doctorPlaceholder')}
                searchPlaceholder={t('appointments.form.doctorSearch')}
                emptyMessage={t('appointments.form.doctorEmpty')}
              />
            )}
          />
        </FormField>
        <FormField label={t('appointments.form.branch')} error={errors.branchId?.message} required>
          <Controller
            control={control}
            name="branchId"
            render={({ field }) => (
              <SearchCombobox
                options={branchOptions}
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t('appointments.form.branchPlaceholder')}
                searchPlaceholder={t('appointments.form.branchSearch')}
                emptyMessage={t('appointments.form.branchEmpty')}
              />
            )}
          />
        </FormField>
      </div>

      {/* ── Scheduling ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <FormField label={t('appointments.form.date')} error={errors.date?.message} required>
          <Input type="date" {...register('date')} />
        </FormField>
        <FormField
          label={t('appointments.form.startTime')}
          error={errors.startTime?.message}
          required
        >
          <Input type="time" {...register('startTime')} />
        </FormField>
        <FormField label={t('appointments.form.endTime')} error={errors.endTime?.message} required>
          <Input type="time" {...register('endTime')} />
        </FormField>
        <FormField label={t('appointments.form.duration')} error={errors.durationMinutes?.message}>
          <Input
            type="number"
            min={5}
            max={480}
            {...register('durationMinutes', {
              setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
            })}
          />
        </FormField>
      </div>

      {/* ── Type / Source / Chair ────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField label={t('appointments.form.type')} error={errors.type?.message} required>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={(val) => {
                  field.onChange(val);
                  // Find the selected type from the API list
                  const allTypes = customTypes ?? [];
                  const selected = allTypes.find((t) => t.code === val);
                  if (selected) {
                    setValue('appointmentTypeId', selected._id);
                    if (selected.defaultDuration) {
                      setValue('durationMinutes', selected.defaultDuration);
                    }
                    if (selected.defaultFee != null) {
                      setValue('consultationFee', selected.defaultFee);
                    }
                  } else {
                    setValue('appointmentTypeId', undefined as unknown as string);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('appointments.form.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {defaultTypes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t('appointments.form.selectDefault')}</SelectLabel>
                      {defaultTypes.map((t) => (
                        <SelectItem key={t._id} value={t.code}>
                          {t.name.en}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {extraTypes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t('appointments.form.selectCustom')}</SelectLabel>
                      {extraTypes.map((t) => (
                        <SelectItem key={t._id} value={t.code}>
                          {t.name.en}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label={t('appointments.form.source')} error={errors.source?.message}>
          <Controller
            control={control}
            name="source"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentSourceEnum.options.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField label={t('appointments.form.chair')} error={errors.chairNumber?.message}>
          {chairOptions.length > 0 ? (
            <Controller
              control={control}
              name="chairNumber"
              render={({ field }) => (
                <Select
                  value={field.value != null ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('appointments.form.chairPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {chairOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : (
            <Input
              type="number"
              min={1}
              placeholder={t('appointments.form.chairBranchFirst')}
              {...register('chairNumber', {
                setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
              })}
            />
          )}
        </FormField>
      </div>

      {/* ── Walk-in toggle ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="isWalkIn"
          render={({ field }) => (
            <Switch
              id="isWalkIn"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label={t('appointments.form.walkIn')}
            />
          )}
        />
        <Label htmlFor="isWalkIn">{t('appointments.form.walkIn')}</Label>
      </div>

      {/* ── Notes / Reason ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('appointments.form.reason')} error={errors.reason?.message}>
          <Textarea
            placeholder={t('appointments.form.reasonPlaceholder')}
            rows={2}
            {...register('reason')}
          />
        </FormField>
        <FormField label={t('appointments.form.notes')} error={errors.notes?.message}>
          <Textarea
            placeholder={t('appointments.form.notesPlaceholder')}
            rows={2}
            {...register('notes')}
          />
        </FormField>
      </div>

      <FormField label={t('appointments.form.internalNotes')} error={errors.internalNotes?.message}>
        <Textarea
          placeholder={t('appointments.form.internalNotesPlaceholder')}
          rows={2}
          {...register('internalNotes')}
        />
      </FormField>

      {/* ── Fee ─────────────────────────────────────────── */}
      <FormField
        label={t('appointments.form.consultationFee')}
        error={errors.consultationFee?.message}
      >
        <Input
          type="number"
          min={0}
          step={0.01}
          placeholder={t('appointments.form.feePlaceholder')}
          {...register('consultationFee', {
            setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)),
          })}
        />
      </FormField>

      {/* ── Submit ──────────────────────────────────────── */}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? t('appointments.form.bookBtn') : t('appointments.form.saveBtn')}
        </Button>
      </DialogFooter>

      {/* ── Inline New Patient Dialog ───────────────────── */}
      <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
        <DialogContent className="max-w-4xl">
          <PatientForm
            onSubmit={handleCreatePatient}
            isPending={createPatientMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </form>
  );
}
