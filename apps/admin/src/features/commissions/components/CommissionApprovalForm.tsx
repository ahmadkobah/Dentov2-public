/**
 * CommissionApprovalForm — Dialog form for approving commissions with notes/reason.
 * Replaces the single-click approve button with a proper form.
 * Per DENTO_V2_MASTER_PLAN.md §12 (doctor commission sub-section).
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/lib/zod-resolver.js';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  Textarea,
  Badge,
} from '@dento/ui';
import { CheckCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Validation Schema ──────────────────────────────────

const approvalSchema = z.object({ notes: z.string().optional() }).strict();
type ApprovalFormValues = z.infer<typeof approvalSchema>;

// ── Types ──────────────────────────────────────────────

interface CommissionSummary {
  _id: string;
  doctorName: string;
  invoiceNumber: string;
  commissionAmount: number;
  commissionRate: number;
}

interface CommissionApprovalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single or bulk commissions to approve */
  commissions: CommissionSummary[];
  onConfirm: (data: { ids: string[]; notes?: string }) => Promise<void>;
  isPending?: boolean;
}

// ── Component ──────────────────────────────────────────

export function CommissionApprovalForm({
  open,
  onOpenChange,
  commissions,
  onConfirm,
  isPending = false,
}: CommissionApprovalFormProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset } = useForm<ApprovalFormValues>({
    resolver: zodFormResolver(approvalSchema),
    defaultValues: { notes: '' },
  });

  useEffect(() => {
    if (open) reset({ notes: '' });
  }, [open, reset]);

  const totalAmount = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const isBulk = commissions.length > 1;

  const onFormSubmit = async (data: ApprovalFormValues) => {
    if (isPending) return;
    await onConfirm({
      ids: commissions.map((c) => c._id),
      notes: data.notes?.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {isBulk
              ? t('commissions.approval.titleBulk', { count: commissions.length })
              : t('commissions.approval.titleSingle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Commission summary */}
          {!isBulk && commissions[0] && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('commissions.approval.doctor')}</span>
                <span className="font-medium">{commissions[0].doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('commissions.approval.invoice')}</span>
                <span className="font-mono">{commissions[0].invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('commissions.approval.rate')}</span>
                <span>{commissions[0].commissionRate}%</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">
                  {t('commissions.approval.commission')}
                </span>
                <span className="font-semibold text-primary">
                  {formatCurrency(commissions[0].commissionAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Bulk summary */}
          {isBulk && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('commissions.approval.commissionsCount')}
                  </span>
                  <Badge variant="secondary">{commissions.length}</Badge>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">
                    {t('commissions.approval.totalAmount')}
                  </span>
                  <span className="font-semibold text-primary">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
              {/* Scrollable list */}
              <div className="max-h-40 overflow-y-auto rounded border divide-y text-sm">
                {commissions.map((c) => (
                  <div key={c._id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-medium">{c.doctorName}</span>
                      <span className="ms-2 text-muted-foreground font-mono text-xs">
                        {c.invoiceNumber}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(c.commissionAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval notes */}
          <div className="space-y-2">
            <Label htmlFor="approval-notes">{t('commissions.approval.notes')}</Label>
            <Textarea
              id="approval-notes"
              {...register('notes')}
              placeholder={t('commissions.approval.notesPlaceholder')}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>
              {t('commissions.approval.cancelBtn')}
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit(onFormSubmit)}
            disabled={isPending || commissions.length === 0}
          >
            {isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('commissions.approval.approveBtn')} {isBulk ? `(${commissions.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
