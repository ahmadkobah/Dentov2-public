/**
 * RecordInstallmentPaymentDialog — Modal dialog for recording installment payments
 * with support for partial amounts, payment method selection, and notes.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import { recordInstallmentPaymentSchema } from '@dento/shared';
import { formatCurrency } from '@/lib/currency.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Label,
  Textarea,
} from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';

// ── Form Schema (derived from @dento/shared) ───────────

const dialogFormSchema = z.object({
  amount: recordInstallmentPaymentSchema.shape.amountPaid, // 'amount' in form → 'amountPaid' in shared
  notes: recordInstallmentPaymentSchema.shape.notes,
});
type DialogFormValues = z.infer<typeof dialogFormSchema>;

// ── Types ──────────────────────────────────────────────

interface RecordInstallmentPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  installmentNumber: number;
  dueAmount: number;
  paidAmount: number;
  onConfirm: (data: { amount: number; notes?: string }) => Promise<void>;
  isPending?: boolean;
}

// ── Component ──────────────────────────────────────────

export function RecordInstallmentPaymentDialog({
  open,
  onOpenChange,
  installmentNumber,
  dueAmount,
  paidAmount,
  onConfirm,
  isPending = false,
}: RecordInstallmentPaymentDialogProps) {
  const remainingAmount = dueAmount - paidAmount;
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DialogFormValues>({
    resolver: zodFormResolver(dialogFormSchema),
    defaultValues: { amount: remainingAmount, notes: '' },
  });

  const amount = watch('amount') ?? 0;

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({ amount: remainingAmount, notes: '' });
    }
  }, [open, remainingAmount, reset]);

  const canSubmit = amount > 0 && amount <= remainingAmount && !isPending;

  const onFormSubmit = async (data: DialogFormValues) => {
    if (!canSubmit) return;
    await onConfirm({
      amount: Number(data.amount),
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('installments.recordPayment.title', { number: installmentNumber })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('installments.recordPayment.dueAmount')}
              </span>
              <span className="font-medium">{formatCurrency(dueAmount)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">
                  {t('installments.recordPayment.alreadyPaid')}
                </span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t pt-1">
              <span className="text-muted-foreground">
                {t('installments.recordPayment.remaining')}
              </span>
              <span className="font-semibold">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t('installments.recordPayment.paymentAmount')}</Label>
            <Input
              id="payment-amount"
              type="number"
              min={0.01}
              max={remainingAmount}
              step={0.01}
              {...register('amount', { valueAsNumber: true })}
              placeholder={`Max ${formatCurrency(remainingAmount)}`}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            {amount > remainingAmount && (
              <p className="text-xs text-destructive">
                {t('installments.recordPayment.exceedsBalance', {
                  amount: formatCurrency(remainingAmount),
                })}
              </p>
            )}
            {amount > 0 && amount < remainingAmount && (
              <p className="text-xs text-muted-foreground">
                {t('installments.recordPayment.partialWarning', {
                  amount: formatCurrency(remainingAmount - amount),
                })}
              </p>
            )}
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('amount', remainingAmount)}
              disabled={isPending}
            >
              {t('installments.recordPayment.fullAmount', {
                amount: formatCurrency(remainingAmount),
              })}
            </Button>
            {remainingAmount > 100 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue('amount', Math.round((remainingAmount / 2) * 100) / 100)}
                disabled={isPending}
              >
                {t('installments.recordPayment.halfAmount', {
                  amount: formatCurrency(Math.round((remainingAmount / 2) * 100) / 100),
                })}
              </Button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="payment-notes">{t('installments.recordPayment.notesOptional')}</Label>
            <Textarea
              id="payment-notes"
              {...register('notes')}
              placeholder={t('installments.recordPayment.notesPlaceholder')}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              {t('installments.recordPayment.cancel')}
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit(onFormSubmit)} disabled={!canSubmit}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('installments.recordPayment.recordAmount', { amount: formatCurrency(amount) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
