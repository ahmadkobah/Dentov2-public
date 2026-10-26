/**
 * PaymentForm — Form for recording a new payment against an invoice.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 * Uses react-hook-form + Zod for client-side validation.
 */

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { createPaymentSchema, TENANT_PAYMENT_METHODS } from '@dento/shared';
import { Button, Input, Label, Textarea, Card, CardContent } from '@dento/ui';
import { Loader2 } from 'lucide-react';
import type { PaymentMethod } from '../hooks/usePayments.js';
import { PaymentMethodSelector } from './PaymentMethodSelector.js';
import {
  InvoiceCombobox,
  type InvoiceComboboxInvoice,
} from '@/components/entity-selectors/InvoiceCombobox.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Validation Schema (derived from @dento/shared) ─────

const paymentFormSchema = z.object({
  invoiceId: createPaymentSchema.shape.invoiceId,
  amount: createPaymentSchema.shape.amount,
  method: z.enum(TENANT_PAYMENT_METHODS), // form uses 'method'; shared uses 'paymentMethod'
  reference: z.string().max(200).optional(), // form uses 'reference'; shared uses 'paymentReference'
  notes: createPaymentSchema.shape.notes,
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

const PAYMENT_METHOD_KEY_MAP: Record<PaymentMethod, string> = {
  cash: 'payments.method.cash',
  card: 'payments.method.card',
  bank_transfer: 'payments.method.bankTransfer',
  cheque: 'payments.method.cheque',
  insurance: 'payments.method.insurance',
  online: 'payments.method.online',
  fawry: 'payments.method.fawry',
  meeza: 'payments.method.meeza',
};

// ── Types ──────────────────────────────────────────────

interface PaymentFormProps {
  defaultInvoiceId?: string;
  onSubmit: (data: {
    invoiceId: string;
    patientId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentReference?: string;
    notes?: string;
  }) => void;
  isPending?: boolean;
}

// ── Component ──────────────────────────────────────────

export function PaymentForm({ defaultInvoiceId, onSubmit, isPending = false }: PaymentFormProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodFormResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: defaultInvoiceId ?? '',
      amount: 0,
      method: 'cash',
      reference: '',
      notes: '',
    },
  });

  const amount = watch('amount');
  const method = watch('method');
  const patientIdRef = React.useRef<string>('');

  const handleInvoiceSelect = (inv: InvoiceComboboxInvoice | null) => {
    if (inv) {
      patientIdRef.current = inv.patientId;
      if (inv.balanceDue > 0) {
        setValue('amount', inv.balanceDue);
      }
    } else {
      patientIdRef.current = '';
    }
  };

  const onValid = (data: PaymentFormValues) => {
    onSubmit({
      invoiceId: data.invoiceId,
      patientId: patientIdRef.current,
      amount: data.amount,
      paymentMethod: data.method as PaymentMethod,
      paymentReference: data.reference || undefined,
      notes: data.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6">
      {/* Invoice */}
      <div className="space-y-2">
        <Label htmlFor="invoiceId">{t('payments.form.invoice')} *</Label>
        <Controller
          name="invoiceId"
          control={control}
          render={({ field }) => (
            <InvoiceCombobox
              value={field.value}
              onValueChange={field.onChange}
              onInvoiceSelect={handleInvoiceSelect}
            />
          )}
        />
        {errors.invoiceId && <p className="text-sm text-destructive">{errors.invoiceId.message}</p>}
      </div>

      {/* Amount & Method */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">{t('payments.form.amount')} *</Label>
          <Input
            id="amount"
            type="number"
            min={0.01}
            step="0.01"
            placeholder="0.00"
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>{t('payments.form.paymentMethod')} *</Label>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <PaymentMethodSelector
                value={field.value as PaymentMethod}
                onChange={(v) => field.onChange(v)}
              />
            )}
          />
          {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
        </div>
      </div>

      {/* Reference */}
      <div className="space-y-2">
        <Label htmlFor="reference">
          {t('payments.form.reference')} / {t('payments.form.transactionId')}
        </Label>
        <Input
          id="reference"
          placeholder={t('payments.form.referencePlaceholder')}
          {...register('reference')}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('payments.form.notes')}</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder={t('payments.form.notesPlaceholder')}
          {...register('notes')}
        />
      </div>

      {/* Summary */}
      {(amount || 0) > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-1 text-sm">
            <div className="flex justify-between font-semibold">
              <span>{t('payments.form.paymentAmount')}</span>
              <span>{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t('payments.receipt.method')}</span>
              <span>{t(PAYMENT_METHOD_KEY_MAP[method])}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('payments.form.submit')}
        </Button>
      </div>
    </form>
  );
}
