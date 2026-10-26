/**
 * Appointment Type Form — RHF + Zod (§8.4).
 * Bilingual name, code, duration, color, fee, toggles.
 */

import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createAppointmentTypeSchema, type CreateAppointmentTypeInput } from '@dento/shared';
import {
  Button,
  FormField,
  Input,
  Switch,
  Label,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@dento/ui';
import { Loader2, Palette } from 'lucide-react';
import { useSupportedLanguages } from '../../../hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Props ────────────────────────────────────────────── */

interface AppointmentTypeFormProps {
  defaultValues?: Partial<CreateAppointmentTypeInput>;
  onSubmit: (data: CreateAppointmentTypeInput) => void | Promise<void>;
  isPending?: boolean;
  mode?: 'create' | 'edit';
  /** When true, name and code fields are read-only (built-in types) */
  isDefault?: boolean;
}

/* ── Component ────────────────────────────────────────── */

export function AppointmentTypeForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
  isDefault = false,
}: AppointmentTypeFormProps) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateAppointmentTypeInput>({
    resolver: zodFormResolver(createAppointmentTypeSchema),
    defaultValues: {
      defaultDuration: 30,
      color: '#4CAF50',
      isDoctorRequired: true,
      isOnlineBookingAllowed: false,
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {mode === 'create'
            ? t('appointmentTypes.form.createTitle')
            : t('appointmentTypes.form.editTitle')}
        </DialogTitle>
      </DialogHeader>

      {/* Bilingual name */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label={t('appointmentTypes.form.nameEn')}
          error={errors.name?.en?.message}
          required
        >
          <Input
            placeholder={t('appointmentTypes.form.nameEnPlaceholder')}
            {...register('name.en')}
            disabled={isDefault}
          />
        </FormField>
        {isMultiLang && (
          <FormField label={t('appointmentTypes.form.nameAr')} error={errors.name?.ar?.message}>
            <Input
              placeholder="اسم بالعربي"
              dir="rtl"
              {...register('name.ar')}
              disabled={isDefault}
            />
          </FormField>
        )}
      </div>

      {/* Code + Duration */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField label={t('appointmentTypes.form.code')} error={errors.code?.message} required>
          <Input
            placeholder={t('appointmentTypes.form.codePlaceholder')}
            {...register('code')}
            disabled={isDefault}
          />
        </FormField>
        <FormField
          label={t('appointmentTypes.form.duration')}
          error={errors.defaultDuration?.message}
        >
          <Input
            type="number"
            min={5}
            max={480}
            {...register('defaultDuration', { valueAsNumber: true })}
          />
        </FormField>
        <FormField label={t('appointmentTypes.form.fee')} error={errors.defaultFee?.message}>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder={t('appointmentTypes.form.feePlaceholder')}
            {...register('defaultFee', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      {/* Color + Icon */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label={t('appointmentTypes.form.color')} error={errors.color?.message}>
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <input
                  type="color"
                  value={field.value}
                  onChange={field.onChange}
                  className="h-10 w-14 cursor-pointer rounded border p-1"
                />
              )}
            />
            <Input {...register('color')} className="flex-1" />
          </div>
        </FormField>
        <FormField label={t('appointmentTypes.form.icon')} error={errors.icon?.message}>
          <Input placeholder={t('appointmentTypes.form.iconPlaceholder')} {...register('icon')} />
        </FormField>
      </div>

      {/* Booleans */}
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="isDoctorRequired"
            render={({ field }) => (
              <Switch
                id="isDoctorRequired"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label={t('appointmentTypes.form.requiresDoctor')}
              />
            )}
          />
          <Label htmlFor="isDoctorRequired">{t('appointmentTypes.form.requiresDoctor')}</Label>
        </div>

        <div className="flex items-center gap-3">
          <Controller
            control={control}
            name="isOnlineBookingAllowed"
            render={({ field }) => (
              <Switch
                id="isOnlineBookingAllowed"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label={t('appointmentTypes.form.allowOnline')}
              />
            )}
          />
          <Label htmlFor="isOnlineBookingAllowed">{t('appointmentTypes.form.allowOnline')}</Label>
        </div>
      </div>

      {/* Submit */}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'create'
            ? t('appointmentTypes.form.createBtn')
            : t('appointmentTypes.form.saveBtn')}
        </Button>
      </DialogFooter>
    </form>
  );
}
