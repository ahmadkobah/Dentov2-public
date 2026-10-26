/**
 * CreateClaimPage — Page for filing a new insurance claim.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Insurance Claims).
 * Uses react-hook-form + Zod for client-side validation.
 */

import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { createInsuranceClaimSchema } from '@dento/shared';
import { PageHeader, Button, Input, Label, Textarea, Card, CardContent, toast } from '@dento/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCreateInsuranceClaim, type InsuranceClaim } from '../hooks/useInsurance.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { InvoiceCombobox } from '@/components/entity-selectors/InvoiceCombobox.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Validation Schema (derived from @dento/shared) ─────

const claimFormSchema = z.object({
  patientId: createInsuranceClaimSchema.shape.patientId,
  invoiceId: z.string().optional(), // Optional in form; required in shared (auto-linked on backend)
  claimDate: z.string().min(1, 'Claim date is required'), // HTML date input → YYYY-MM-DD
  serviceDate: z.string().min(1, 'Service date is required'),
  totalAmount: createInsuranceClaimSchema.shape.totalAmount,
  claimedAmount: createInsuranceClaimSchema.shape.claimedAmount,
  notes: createInsuranceClaimSchema.shape.notes,
});

type ClaimFormValues = z.infer<typeof claimFormSchema>;

export default function CreateClaimPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const createMutation = useCreateInsuranceClaim();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ClaimFormValues>({
    resolver: zodFormResolver(claimFormSchema),
    defaultValues: {
      patientId: '',
      invoiceId: '',
      claimDate: new Date().toISOString().slice(0, 10),
      serviceDate: '',
      totalAmount: 0,
      claimedAmount: 0,
      notes: '',
    },
  });

  const totalAmount = watch('totalAmount');
  const claimedAmount = watch('claimedAmount');

  const onValid = (data: ClaimFormValues) => {
    createMutation.mutate(
      {
        patientId: data.patientId,
        invoiceId: data.invoiceId || undefined,
        claimDate: data.claimDate,
        serviceDate: data.serviceDate,
        totalAmount: data.totalAmount,
        claimedAmount: data.claimedAmount,
      } as Partial<InsuranceClaim>,
      {
        onSuccess: () => {
          toast.success(t('insurance.createClaim.toast.created'));
          navigate('/insurance-claims');
        },
        onError: (err: any) =>
          toast.error(err?.message ?? t('insurance.createClaim.toast.createFailed')),
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader
        title={t('insurance.createClaim.title')}
        description={t('insurance.createClaim.description')}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/insurance-claims')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('insurance.companyForm.actions.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit(onValid)} className="space-y-6">
          {/* Patient & Invoice */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patientId">{t('insurance.createClaim.labels.patient')}</Label>
              <Controller
                name="patientId"
                control={control}
                render={({ field }) => (
                  <PatientCombobox value={field.value} onValueChange={field.onChange} />
                )}
              />
              {errors.patientId && (
                <p className="text-sm text-destructive">{errors.patientId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceId">{t('insurance.createClaim.labels.invoice')}</Label>
              <Controller
                name="invoiceId"
                control={control}
                render={({ field }) => (
                  <InvoiceCombobox value={field.value ?? ''} onValueChange={field.onChange} />
                )}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="claimDate">{t('insurance.createClaim.labels.claimDate')}</Label>
              <Input id="claimDate" type="date" {...register('claimDate')} />
              {errors.claimDate && (
                <p className="text-sm text-destructive">{errors.claimDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDate">{t('insurance.createClaim.labels.serviceDate')}</Label>
              <Input id="serviceDate" type="date" {...register('serviceDate')} />
              {errors.serviceDate && (
                <p className="text-sm text-destructive">{errors.serviceDate.message}</p>
              )}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">{t('insurance.createClaim.labels.totalAmount')}</Label>
              <Input
                id="totalAmount"
                type="number"
                min={0}
                step="0.01"
                {...register('totalAmount', { valueAsNumber: true })}
              />
              {errors.totalAmount && (
                <p className="text-sm text-destructive">{errors.totalAmount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="claimedAmount">
                {t('insurance.createClaim.labels.claimedAmount')}
              </Label>
              <Input
                id="claimedAmount"
                type="number"
                min={0}
                step="0.01"
                {...register('claimedAmount', { valueAsNumber: true })}
              />
              {errors.claimedAmount && (
                <p className="text-sm text-destructive">{errors.claimedAmount.message}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          {(claimedAmount || 0) > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('insurance.claimDetail.labels.totalAmount')}
                  </span>
                  <span>{formatCurrency(totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>{t('insurance.claimDetail.labels.claimedAmount')}</span>
                  <span>{formatCurrency(claimedAmount)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('insurance.createClaim.labels.notes')}</Label>
            <Textarea id="notes" rows={3} placeholder="Additional notes…" {...register('notes')} />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('insurance.createClaim.actions.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
