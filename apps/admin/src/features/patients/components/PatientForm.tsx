/**
 * Patient Form — React Hook Form + Zod resolver + shared schema.
 * Per BUILD_RULES §8.4.
 */

import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { createPatientSchema, type CreatePatientInput } from '@dento/shared';
import {
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  PhoneInput,
} from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface PatientFormProps {
  defaultValues?: Partial<CreatePatientInput>;
  onSubmit: (data: CreatePatientInput) => void;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

export function PatientForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: PatientFormProps) {
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodFormResolver(createPatientSchema),
    defaultValues: {
      firstName: { en: '', ar: '' },
      lastName: { en: '', ar: '' },
      dateOfBirth: '',
      gender: 'male',
      phone: '',
      preferredLanguage: 'en',
      allergies: [],
      familyLinks: [],
      insurance: [],
      source: 'admin',
      ...defaultValues,
    },
  });

  const gender = watch('gender');
  const source = watch('source');

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === 'create' ? t('patients.form.newTitle') : t('patients.form.editTitle')}
        </DialogTitle>
        <DialogDescription>
          {mode === 'create' ? t('patients.form.newDesc') : t('patients.form.editDesc')}
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-4 max-h-[60vh] space-y-4 overflow-y-auto px-2 scrollbar-none"
      >
        {/* ── Name row ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="firstName.en">{t('patients.form.firstNameEn')} *</Label>
            <Input
              id="firstName.en"
              {...register('firstName.en')}
              aria-describedby={errors.firstName?.en ? 'fn-en-error' : undefined}
            />
            {errors.firstName?.en && (
              <p id="fn-en-error" className="mt-1 text-xs text-red-500">
                {errors.firstName.en.message}
              </p>
            )}
          </div>
          {isMultiLang && (
            <div>
              <Label htmlFor="firstName.ar">{t('patients.form.firstNameAr')}</Label>
              <Input id="firstName.ar" dir="rtl" {...register('firstName.ar')} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="lastName.en">{t('patients.form.lastNameEn')} *</Label>
            <Input
              id="lastName.en"
              {...register('lastName.en')}
              aria-describedby={errors.lastName?.en ? 'ln-en-error' : undefined}
            />
            {errors.lastName?.en && (
              <p id="ln-en-error" className="mt-1 text-xs text-red-500">
                {errors.lastName.en.message}
              </p>
            )}
          </div>
          {isMultiLang && (
            <div>
              <Label htmlFor="lastName.ar">{t('patients.form.lastNameAr')}</Label>
              <Input id="lastName.ar" dir="rtl" {...register('lastName.ar')} />
            </div>
          )}
        </div>

        {/* ── Date of Birth + Gender ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="dateOfBirth">{t('patients.form.dob')} *</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
              aria-describedby={errors.dateOfBirth ? 'dob-error' : undefined}
            />
            {errors.dateOfBirth && (
              <p id="dob-error" className="mt-1 text-xs text-red-500">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="gender">{t('patients.form.gender')} *</Label>
            <Select
              value={gender}
              onValueChange={(v) => setValue('gender', v as CreatePatientInput['gender'])}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t('patients.filter.male')}</SelectItem>
                <SelectItem value="female">{t('patients.filter.female')}</SelectItem>
                <SelectItem value="other">{t('patients.filter.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Contact ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="phone">{t('patients.form.phone')} *</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value}
                  onChange={field.onChange}
                  defaultCountry={tenantCountry}
                />
              )}
            />
            {errors.phone && (
              <p id="phone-error" className="mt-1 text-xs text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">{t('patients.form.email')}</Label>
            <Input id="email" type="email" {...register('email')} />
          </div>
        </div>

        {/* ── National ID ── */}
        <div>
          <Label htmlFor="nationalId">{t('patients.form.nationalId')}</Label>
          <Input id="nationalId" {...register('nationalId')} />
        </div>

        {/* ── Address ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="address">{t('patients.form.address')}</Label>
            <Input id="address" {...register('address')} />
          </div>
          <div>
            <Label htmlFor="city">{t('patients.form.city')}</Label>
            <Input id="city" {...register('city')} />
          </div>
          <div>
            <Label htmlFor="country">{t('patients.form.country')}</Label>
            <Input id="country" {...register('country')} />
          </div>
        </div>

        {/* ── Emergency Contact ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="emergencyContactName">{t('patients.form.emergencyName')}</Label>
            <Input id="emergencyContactName" {...register('emergencyContactName')} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">{t('patients.form.emergencyPhone')}</Label>
            <Controller
              name="emergencyContactPhone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  defaultCountry={tenantCountry}
                />
              )}
            />
          </div>
        </div>

        {/* ── Source + Language ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="source">{t('patients.form.source')}</Label>
            <Select
              value={source}
              onValueChange={(v) => setValue('source', v as CreatePatientInput['source'])}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('patients.form.sourceAdmin')}</SelectItem>
                <SelectItem value="website">{t('patients.form.sourceWebsite')}</SelectItem>
                <SelectItem value="phone">{t('patients.form.sourcePhone')}</SelectItem>
                <SelectItem value="walk_in">{t('patients.form.sourceWalkIn')}</SelectItem>
                <SelectItem value="referral">{t('patients.form.sourceReferral')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="preferredLanguage">{t('patients.form.preferredLanguage')}</Label>
            <Select
              value={watch('preferredLanguage')}
              onValueChange={(v) => setValue('preferredLanguage', v as 'en' | 'ar')}
            >
              <SelectTrigger id="preferredLanguage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Notes ── */}
        <div>
          <Label htmlFor="notes">{t('patients.form.notes')}</Label>
          <Textarea id="notes" rows={3} {...register('notes')} />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create' ? t('patients.form.create') : t('patients.form.save')}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
