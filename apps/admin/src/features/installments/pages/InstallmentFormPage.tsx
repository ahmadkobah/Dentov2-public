/**
 * InstallmentFormPage — Page for creating a new installment plan.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Installment Plans).
 * Uses react-hook-form + Zod for client-side validation.
 */

import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import type { INSTALLMENT_FREQUENCY_VALUES } from '@dento/shared';
import { createInstallmentPlanSchema } from '@dento/shared';
import { formatCurrency } from '@/lib/currency.js';
import {
  PageHeader,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Card,
  CardContent,
  Separator,
  toast,
} from '@dento/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';
import { useCreateInstallment, type InstallmentPlan } from '../hooks/useInstallments.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import {
  InvoiceCombobox,
  type InvoiceComboboxInvoice,
} from '@/components/entity-selectors/InvoiceCombobox.js';

// ── Constants ──────────────────────────────────────────

const FREQUENCIES: { value: (typeof INSTALLMENT_FREQUENCY_VALUES)[number]; label: string }[] = [
  { value: 'weekly', label: 'installments.frequency.weekly' },
  { value: 'biweekly', label: 'installments.frequency.biweeklyAlt' },
  { value: 'monthly', label: 'installments.frequency.monthly' },
];

// ── Validation Schema (derived from @dento/shared) ─────

const installmentFormSchema = z.object({
  patientId: createInstallmentPlanSchema.shape.patientId,
  invoiceId: z.string().optional(), // Optional in form; required in shared
  totalAmount: z
    .number({ error: 'Total amount is required' })
    .positive('Total amount must be greater than 0'),
  downPayment: z
    .number({ error: 'Down payment is required' })
    .min(0, 'Down payment cannot be negative'),
  numberOfInstallments: z
    .number({ error: 'Number of installments is required' })
    .int()
    .min(1, 'At least 1 installment')
    .max(24, 'Maximum 24 installments'),
  frequency: createInstallmentPlanSchema.shape.frequency,
  startDate: z.string().min(1, 'Start date is required'), // HTML date input → YYYY-MM-DD
  notes: createInstallmentPlanSchema.shape.notes,
});

type InstallmentFormValues = z.infer<typeof installmentFormSchema>;

// ── Component ──────────────────────────────────────────

export default function InstallmentFormPage() {
  const navigate = useNavigate();
  const createMutation = useCreateInstallment();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstallmentFormValues>({
    resolver: zodFormResolver(installmentFormSchema),
    defaultValues: {
      patientId: '',
      invoiceId: '',
      totalAmount: 0,
      downPayment: 0,
      numberOfInstallments: 3,
      frequency: 'monthly',
      startDate: new Date().toISOString().slice(0, 10),
      notes: '',
    },
  });

  const totalAmount = watch('totalAmount') || 0;
  const downPayment = watch('downPayment') || 0;
  const numberOfInstallments = watch('numberOfInstallments') || 1;
  const frequency = watch('frequency');

  const remaining = Math.max(0, totalAmount - downPayment);
  const perInstallment = numberOfInstallments > 0 ? remaining / numberOfInstallments : 0;

  const handleInvoiceSelect = (inv: InvoiceComboboxInvoice | null) => {
    if (inv && inv.balanceDue > 0) {
      setValue('totalAmount', inv.balanceDue);
    }
  };

  const onValid = (data: InstallmentFormValues) => {
    createMutation.mutate(
      {
        patientId: data.patientId,
        invoiceId: data.invoiceId || undefined,
        totalAmount: data.totalAmount,
        downPayment: data.downPayment,
        numberOfInstallments: data.numberOfInstallments,
        frequency: data.frequency,
        startDate: new Date(data.startDate).toISOString(),
        notes: data.notes || undefined,
      } as Partial<InstallmentPlan>,
      {
        onSuccess: () => {
          toast.success(t('installments.toast.planCreated'));
          navigate('/installments');
        },
        onError: (err: any) =>
          toast.error(err?.message ?? t('installments.toast.planCreateFailed')),
      },
    );
  };

  const fmt = (n: number) => formatCurrency(n);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader
        title={t('installments.form.title')}
        description={t('installments.form.description')}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/installments')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {t('installments.actions.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <form onSubmit={handleSubmit(onValid)} className="space-y-6">
          {/* Patient & Invoice */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patientId">{t('installments.form.labels.patient')}</Label>
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
              <Label htmlFor="invoiceId">{t('installments.form.labels.invoice')}</Label>
              <Controller
                name="invoiceId"
                control={control}
                render={({ field }) => (
                  <InvoiceCombobox
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    onInvoiceSelect={handleInvoiceSelect}
                  />
                )}
              />
            </div>
          </div>

          {/* Amount & Down Payment */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">{t('installments.form.labels.totalAmount')}</Label>
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
              <Label htmlFor="downPayment">{t('installments.form.labels.downPayment')}</Label>
              <Input
                id="downPayment"
                type="number"
                min={0}
                step="0.01"
                {...register('downPayment', { valueAsNumber: true })}
              />
              {errors.downPayment && (
                <p className="text-sm text-destructive">{errors.downPayment.message}</p>
              )}
            </div>
          </div>

          {/* Installments, Frequency, Start Date */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="numInstallments">
                {t('installments.form.labels.numberOfInstallments')}
              </Label>
              <Input
                id="numInstallments"
                type="number"
                min={1}
                max={24}
                {...register('numberOfInstallments', { valueAsNumber: true })}
              />
              {errors.numberOfInstallments && (
                <p className="text-sm text-destructive">{errors.numberOfInstallments.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('installments.form.labels.frequency')}</Label>
              <Controller
                name="frequency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {t(f.label)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('installments.form.labels.startDate')}</Label>
              <Input id="startDate" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="pt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('installments.form.summary.totalAmount')}
                </span>
                <span>{fmt(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('installments.form.summary.downPayment')}
                </span>
                <span>-{fmt(downPayment)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t('installments.form.summary.remaining')}</span>
                <span>{fmt(remaining)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>
                  {t('installments.form.summary.perInstallment')} ({numberOfInstallments}×{' '}
                  {frequency})
                </span>
                <span>{fmt(perInstallment)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t('installments.form.labels.notes')}</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder={t('installments.form.notesPlaceholder')}
              {...register('notes')}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('installments.actions.createPlan')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
