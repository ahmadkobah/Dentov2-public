/**
 * Create Payout Dialog
 * Uses internal React Hook Form + Zod for form management.
 */

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Label,
} from '@dento/ui';
import { Plus, Loader2 } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Validation Schema ──────────────────────────────────

const payoutFormSchema = z
  .object({
    doctorId: z.string().min(1, 'Doctor is required'),
    paymentMethod: z.enum(['cash', 'bank_transfer', 'cheque']),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

type PayoutFormValues = z.infer<typeof payoutFormSchema>;

interface CreatePayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvedByDoctor: Map<string, { name: string; ids: string[] }>;
  onSubmit: (data: PayoutFormValues) => Promise<void>;
  isPending: boolean;
}

export function CreatePayoutDialog({
  open,
  onOpenChange,
  approvedByDoctor,
  onSubmit,
  isPending,
}: CreatePayoutDialogProps) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PayoutFormValues>({
    resolver: zodFormResolver(payoutFormSchema),
    defaultValues: {
      doctorId: '',
      paymentMethod: 'bank_transfer',
      reference: '',
      notes: '',
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  if (approvedByDoctor.size === 0) return null;

  const onFormSubmit = async (data: PayoutFormValues) => {
    await onSubmit({
      ...data,
      reference: data.reference?.trim() || undefined,
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="me-2 h-4 w-4" />
          {t('commissions.payout.triggerBtn')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('commissions.payout.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('commissions.payout.doctor')}</Label>
            <Controller
              name="doctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(approvedByDoctor.entries()).map(([id, { name, ids }]) => (
                      <SelectItem key={id} value={id}>
                        {name} ({ids.length} approved)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.doctorId && (
              <p className="text-xs text-destructive">{errors.doctorId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t('commissions.payout.paymentMethod')}</Label>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('commissions.payout.method.cash')}</SelectItem>
                    <SelectItem value="bank_transfer">
                      {t('commissions.payout.method.bankTransfer')}
                    </SelectItem>
                    <SelectItem value="cheque">{t('commissions.payout.method.cheque')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('commissions.payout.reference')}</Label>
            <Input placeholder="Transaction reference (optional)" {...register('reference')} />
          </div>
          <div className="space-y-2">
            <Label>{t('commissions.payout.notes')}</Label>
            <Input placeholder="Notes (optional)" {...register('notes')} />
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('commissions.payout.cancelBtn')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit(onFormSubmit)} disabled={isPending}>
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('commissions.payout.submitBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
