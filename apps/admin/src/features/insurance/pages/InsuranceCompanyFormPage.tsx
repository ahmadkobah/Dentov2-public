/**
 * InsuranceCompanyFormPage — Create / edit an insurance company.
 * Uses :id param for edit mode.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Insurance Management).
 * Uses react-hook-form + Zod for client-side validation.
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { createInsuranceCompanySchema } from '@dento/shared';
import {
  PageHeader,
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Separator,
  toast,
  PhoneInput,
} from '@dento/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import {
  useInsuranceCompanyDetail,
  useCreateInsuranceCompany,
  useUpdateInsuranceCompany,
  type InsuranceCompany,
} from '../hooks/useInsurance.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Validation Schema (derived from @dento/shared) ─────

const companyFormSchema = z.object({
  nameEn: z.string().min(1, 'English name is required'), // Flat name fields for form UX; mapped to name.{en,ar} on submit
  nameAr: z.string().optional(),
  code: createInsuranceCompanySchema.shape.code,
  contactPerson: createInsuranceCompanySchema.shape.contactPerson,
  phone: createInsuranceCompanySchema.shape.phone,
  email: z.string().email('Invalid email address').or(z.literal('')).optional(), // Allow empty string from input
  coveragePercentage: z
    .number({ error: 'Coverage percentage is required' })
    .min(0, 'Cannot be negative')
    .max(100, 'Cannot exceed 100%'),
  maxCoverage: z.number({ error: 'Max coverage is required' }).min(0, 'Cannot be negative'),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

// ── Component ──────────────────────────────────────────

export default function InsuranceCompanyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const tenantCountry = useTenantCountry();
  const { isMultiLang } = useSupportedLanguages();
  const isEdit = !!id;

  const { data: company, isLoading, isError, error } = useInsuranceCompanyDetail(id ?? '');
  const createMutation = useCreateInsuranceCompany();
  const updateMutation = useUpdateInsuranceCompany();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodFormResolver(companyFormSchema),
    defaultValues: {
      nameEn: '',
      nameAr: '',
      code: '',
      contactPerson: '',
      phone: '',
      email: '',
      coveragePercentage: 80,
      maxCoverage: 0,
    },
  });

  // Populate form when company data loads (edit mode)
  useEffect(() => {
    if (company) {
      reset({
        nameEn: company.name?.en ?? '',
        nameAr: company.name?.ar ?? '',
        code: company.code ?? '',
        contactPerson: company.contactPerson ?? '',
        phone: company.phone ?? '',
        email: company.email ?? '',
        coveragePercentage: company.coveragePercentage ?? 80,
        maxCoverage: company.maxCoverage ?? 0,
      });
    }
  }, [company, reset]);

  const onValid = (data: CompanyFormValues) => {
    const payload: Partial<InsuranceCompany> = {
      name: { en: data.nameEn, ar: data.nameAr ?? '' },
      code: data.code,
      contactPerson: data.contactPerson || undefined,
      phone: data.phone || undefined,
      email: data.email || undefined,
      coveragePercentage: data.coveragePercentage,
      maxCoverage: data.maxCoverage || undefined,
    };

    if (isEdit && id) {
      updateMutation.mutate(
        { id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('insurance.companyForm.toast.updated'));
            navigate('/insurance-companies');
          },
          onError: (err: any) =>
            toast.error(err?.message ?? t('insurance.companyForm.toast.updateFailed')),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Company created');
          navigate('/insurance-companies');
        },
        onError: (err: any) => toast.error(err?.message ?? 'Create failed'),
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isEdit && isError) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('insurance.companyDetail.error.loadFailed')}
          message={error?.message ?? 'Company not found'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader
        title={
          isEdit
            ? `${t('insurance.companyForm.editTitle').replace('{{name}}', company?.name?.en ?? 'Company')}`
            : t('insurance.companyForm.createTitle')
        }
        description={
          isEdit
            ? t('insurance.companyForm.editDescription')
            : t('insurance.companyForm.createDescription')
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/insurance-companies')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('insurance.companyForm.actions.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit(onValid)} className="space-y-6">
          {/* Company Name (bilingual) */}
          <Card>
            <CardContent className="pt-4 space-y-4">
              <h4 className="text-sm font-semibold">
                {t('insurance.companyForm.labels.companyName')}
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">{t('insurance.companyForm.labels.nameEnglish')}</Label>
                  <Input
                    id="nameEn"
                    placeholder={t('insurance.companyForm.placeholders.nameEnglish')}
                    {...register('nameEn')}
                  />
                  {errors.nameEn && (
                    <p className="text-sm text-destructive">{errors.nameEn.message}</p>
                  )}
                </div>
                {isMultiLang && (
                  <div className="space-y-2">
                    <Label htmlFor="nameAr">{t('insurance.companyForm.labels.nameArabic')}</Label>
                    <Input
                      id="nameAr"
                      dir="rtl"
                      placeholder="اسم الشركة بالعربية"
                      {...register('nameAr')}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">{t('insurance.companyForm.labels.companyCode')}</Label>
            <Input
              id="code"
              placeholder={t('insurance.companyForm.placeholders.companyCode')}
              {...register('code')}
            />
            {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">
                {t('insurance.companyForm.labels.contactPerson')}
              </Label>
              <Input
                id="contactPerson"
                placeholder={t('insurance.companyForm.placeholders.contactPerson')}
                {...register('contactPerson')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('insurance.companyForm.labels.phone')}</Label>
              <Controller
                name="phone"
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
            <div className="space-y-2">
              <Label htmlFor="email">{t('insurance.companyForm.labels.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('insurance.companyForm.placeholders.email')}
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <Separator />

          {/* Coverage */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="coveragePct">
                {t('insurance.companyForm.labels.defaultCoveragePercent')}
              </Label>
              <Input
                id="coveragePct"
                type="number"
                min={0}
                max={100}
                step="0.01"
                {...register('coveragePercentage', { valueAsNumber: true })}
              />
              {errors.coveragePercentage && (
                <p className="text-sm text-destructive">{errors.coveragePercentage.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCoverage">
                {t('insurance.companyForm.labels.maxCoverageAmount')}
              </Label>
              <Input
                id="maxCoverage"
                type="number"
                min={0}
                step="0.01"
                placeholder={t('insurance.companyForm.placeholders.maxCoverage')}
                {...register('maxCoverage', { valueAsNumber: true })}
              />
              {errors.maxCoverage && (
                <p className="text-sm text-destructive">{errors.maxCoverage.message}</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isEdit ? updateMutation.isPending : createMutation.isPending}
            >
              {(isEdit ? updateMutation.isPending : createMutation.isPending) && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              {isEdit
                ? t('insurance.companyForm.actions.update')
                : t('insurance.companyForm.actions.create')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
