/**
 * InvoiceForm — Reusable form for creating/editing invoices.
 * Dynamic line items, patient selector, discount/tax, currency.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 * Uses react-hook-form + Zod for client-side validation.
 */

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { createInvoiceSchema } from '@dento/shared';
import {
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
  CardHeader,
  CardTitle,
  Separator,
} from '@dento/ui';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { Invoice } from '../hooks/useInvoices.js';
import { PatientCombobox } from '@/components/entity-selectors/PatientCombobox.js';
import { BranchCombobox } from '@/components/entity-selectors/BranchCombobox.js';
import { DoctorCombobox } from '@/components/entity-selectors/DoctorCombobox.js';
import { getDefaultCurrency, getDefaultTaxRate } from '@/lib/currency.js';
import { useTranslation } from '@/stores/locale.store.js';
import { useCurrencyOptions } from '@/hooks/useCountryConfigs.js';

// ── Helpers ────────────────────────────────────────────

function computeItemTotal(item: {
  quantity?: number;
  unitPrice?: number;
  discount?: number;
}): number {
  const qty = item.quantity ?? 0;
  const price = item.unitPrice ?? 0;
  const disc = item.discount ?? 0;
  return qty * price - disc;
}

// ── Validation Schema (derived from @dento/shared) ─────

const formItemSchema = z.object({
  description: z.string().min(1, 'invoices.form.validation.descriptionRequired').max(500),
  toothNumber: z.string().max(10).optional(),
  quantity: z
    .number({ error: 'invoices.form.validation.qtyRequired' })
    .int()
    .min(1, 'invoices.form.validation.qtyMin'),
  unitPrice: z
    .number({ error: 'invoices.form.validation.qtyRequired' })
    .min(0, 'invoices.form.validation.cannotBeNegative'),
  discount: z
    .number({ error: 'invoices.form.validation.qtyRequired' })
    .min(0, 'invoices.form.validation.cannotBeNegative'),
});

const invoiceFormSchema = z.object({
  patientId: createInvoiceSchema.shape.patientId,
  branchId: createInvoiceSchema.shape.branchId,
  doctorId: createInvoiceSchema.shape.doctorId,
  items: z.array(formItemSchema).min(1, 'invoices.form.validation.atLeastOneItem'),
  discountPercentage: z.number({ error: 'Required' }).min(0).max(100),
  taxPercentage: z.number({ error: 'Required' }).min(0).max(100),
  currency: z.string().min(1),
  dueDate: z
    .string()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}/.test(v), 'invoices.form.validation.invalidDate')
    .transform((v) => v || undefined)
    .optional(),
  notes: createInvoiceSchema.shape.notes,
  terms: createInvoiceSchema.shape.terms,
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// ── Types ──────────────────────────────────────────────

interface InvoiceFormProps {
  defaultValues?: Partial<Invoice>;
  onSubmit: (data: Partial<Invoice>) => void;
  isPending?: boolean;
  mode?: 'create' | 'edit';
}

// ── Component ──────────────────────────────────────────

export function InvoiceForm({
  defaultValues,
  onSubmit,
  isPending = false,
  mode = 'create',
}: InvoiceFormProps) {
  const { t } = useTranslation();
  const currencyOptions = useCurrencyOptions();
  const resolveId = (val: string | { _id: string } | undefined): string =>
    typeof val === 'object' && val !== null ? val._id : (val ?? '');

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodFormResolver(invoiceFormSchema),
    defaultValues: {
      patientId: resolveId(defaultValues?.patientId as any),
      branchId: resolveId(defaultValues?.branchId as any),
      doctorId: resolveId(defaultValues?.doctorId as any) || undefined,
      items:
        defaultValues?.items && defaultValues.items.length > 0
          ? defaultValues.items.map((it) => ({
              description: it.description ?? '',
              toothNumber: it.toothNumber ?? '',
              quantity: it.quantity ?? 1,
              unitPrice: it.unitPrice ?? 0,
              discount: it.discount ?? 0,
            }))
          : [{ description: '', toothNumber: '', quantity: 1, unitPrice: 0, discount: 0 }],
      discountPercentage: defaultValues?.discountPercentage ?? 0,
      taxPercentage: defaultValues?.taxPercentage ?? getDefaultTaxRate(),
      currency: defaultValues?.currency ?? getDefaultCurrency(),
      dueDate: defaultValues?.dueDate?.slice(0, 10) ?? '',
      notes: defaultValues?.notes ?? '',
      terms: defaultValues?.terms ?? '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // ── Totals (watch all items for live update) ───

  const watchedItems = watch('items');
  const discountPercentage = watch('discountPercentage') || 0;
  const taxPercentage = watch('taxPercentage') || 0;
  const currency = watch('currency') || getDefaultCurrency();

  const subtotal = (watchedItems ?? []).reduce((s, it) => s + computeItemTotal(it), 0);
  const discountAmount = subtotal * (discountPercentage / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxPercentage / 100);
  const totalAmount = afterDiscount + taxAmount;

  // ── Submit ─────────────────────────────────────

  const onValid = (data: InvoiceFormValues) => {
    const items = data.items.map((it) => ({
      description: it.description,
      toothNumber: it.toothNumber,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discount: it.discount,
      total: computeItemTotal(it),
    }));
    const sub = items.reduce((s, it) => s + it.total, 0);
    const discAmt = sub * (data.discountPercentage / 100);
    const afterDisc = sub - discAmt;
    const taxAmt = afterDisc * (data.taxPercentage / 100);
    const total = afterDisc + taxAmt;

    onSubmit({
      patientId: data.patientId,
      branchId: data.branchId,
      doctorId: data.doctorId || undefined,
      items,
      subtotal: sub,
      discountAmount: discAmt,
      discountPercentage: data.discountPercentage,
      taxAmount: taxAmt,
      taxPercentage: data.taxPercentage,
      totalAmount: total,
      currency: data.currency,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      notes: data.notes || undefined,
      terms: data.terms || undefined,
    });
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {/* Patient & Branch */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patientId">{t('invoices.form.labels.patient')}</Label>
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
          <Label htmlFor="branchId">{t('invoices.form.labels.branch')}</Label>
          <Controller
            name="branchId"
            control={control}
            render={({ field }) => (
              <BranchCombobox value={field.value} onValueChange={field.onChange} />
            )}
          />
          {errors.branchId && <p className="text-sm text-destructive">{errors.branchId.message}</p>}
        </div>
      </div>

      {/* Treating Doctor (optional) — enables filtering invoices by doctor */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="doctorId">{t('invoices.form.labels.doctor')}</Label>
          <Controller
            name="doctorId"
            control={control}
            render={({ field }) => (
              <DoctorCombobox value={field.value ?? ''} onValueChange={field.onChange} />
            )}
          />
        </div>
      </div>

      {/* Currency & Due Date */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('invoices.form.labels.currency')}</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">{t('invoices.form.labels.dueDate')}</Label>
          <Input id="dueDate" type="date" {...register('dueDate')} />
        </div>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">{t('invoices.form.lineItems.title')}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ description: '', toothNumber: '', quantity: 1, unitPrice: 0, discount: 0 })
            }
          >
            <Plus className="me-1 h-4 w-4" /> {t('invoices.form.lineItems.addItem')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Header row */}
          <div className="hidden md:grid md:grid-cols-12 md:gap-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">{t('invoices.form.lineItems.columns.description')}</div>
            <div className="col-span-1">{t('invoices.form.lineItems.columns.tooth')}</div>
            <div className="col-span-2 text-end">{t('invoices.form.lineItems.columns.qty')}</div>
            <div className="col-span-2 text-end">
              {t('invoices.form.lineItems.columns.unitPrice')}
            </div>
            <div className="col-span-2 text-end">
              {t('invoices.form.lineItems.columns.discount')}
            </div>
            <div className="col-span-1" />
          </div>

          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 md:col-span-4">
                <Input
                  placeholder={t('invoices.form.placeholders.description')}
                  {...register(`items.${idx}.description`)}
                />
                {errors.items?.[idx]?.description && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.items[idx]?.description?.message}
                  </p>
                )}
              </div>
              <div className="col-span-4 md:col-span-1">
                <Input
                  placeholder={t('invoices.form.placeholders.toothNumber')}
                  {...register(`items.${idx}.toothNumber`)}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Input
                  type="number"
                  min={1}
                  {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register(`items.${idx}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-3 md:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  {...register(`items.${idx}.discount`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (fields.length > 1) remove(idx);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {errors.items?.root && (
            <p className="text-sm text-destructive">{errors.items.root.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Discount & Tax */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discountPct">{t('invoices.form.labels.discountPercent')}</Label>
          <Input
            id="discountPct"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register('discountPercentage', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxPct">{t('invoices.form.labels.taxPercent')}</Label>
          <Input
            id="taxPct"
            type="number"
            min={0}
            max={100}
            step="0.01"
            {...register('taxPercentage', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('invoices.form.totals.subtotal')}</span>
            <span>{fmt(subtotal)}</span>
          </div>
          {discountPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('invoices.form.totals.discount', { percent: discountPercentage })}
              </span>
              <span className="text-destructive">-{fmt(discountAmount)}</span>
            </div>
          )}
          {taxPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('invoices.form.totals.tax', { percent: taxPercentage })}
              </span>
              <span>{fmt(taxAmount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>{t('invoices.form.totals.total')}</span>
            <span>{fmt(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="notes">{t('invoices.form.labels.notes')}</Label>
          <Textarea
            id="notes"
            rows={3}
            placeholder={t('invoices.form.placeholders.notes')}
            {...register('notes')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="terms">{t('invoices.form.labels.termsAndConditions')}</Label>
          <Textarea
            id="terms"
            rows={3}
            placeholder={t('invoices.form.placeholders.terms')}
            {...register('terms')}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {mode === 'edit'
            ? t('invoices.form.actions.updateInvoice')
            : t('invoices.form.actions.createInvoice')}
        </Button>
      </div>
    </form>
  );
}
