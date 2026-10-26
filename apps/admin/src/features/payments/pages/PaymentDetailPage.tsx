/**
 * PaymentDetailPage — View details of a single payment.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaymentDetail, useRefundPayment, type TenantPayment } from '../hooks/usePayments.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  toast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
} from '@dento/ui';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { formatDate } from '@/lib/date.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Status helpers ─────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  completed: 'default',
  failed: 'destructive',
  refunded: 'secondary',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  insurance: 'Insurance',
  online: 'Online',
  fawry: 'Fawry',
  meeza: 'Meeza',
};

function patientName(p: TenantPayment): string {
  if (typeof p.patientId === 'object' && p.patientId) {
    const pt = p.patientId;
    return `${pt.firstName?.en ?? ''} ${pt.lastName?.en ?? ''}`.trim() || pt.patientCode;
  }
  return String(p.patientId);
}

function invoiceNumber(p: TenantPayment): string {
  if (typeof p.invoiceId === 'object' && p.invoiceId) {
    return p.invoiceId.invoiceNumber;
  }
  return String(p.invoiceId);
}

// ── Component ──────────────────────────────────────────

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: payment, isLoading, isError, error, refetch } = usePaymentDetail(id!);
  const refundMutation = useRefundPayment();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-64 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load payment"
          message={error?.message ?? 'Payment not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const handleRefund = async () => {
    if (!refundReason.trim()) return;
    try {
      await refundMutation.mutateAsync({ id: payment._id, reason: refundReason.trim() });
      toast.success(t('payments.toast.refunded'));
      setRefundOpen(false);
      setRefundReason('');
    } catch {
      toast.error(t('payments.toast.refundFailed'));
    }
  };

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('payments.detail.title')}
        description={`Payment for ${patientName(payment)}`}
      >
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/payments')}>
            <ArrowLeft className="me-2 h-4 w-4" /> Back
          </Button>
          {payment.status === 'completed' && (
            <Button variant="destructive" size="sm" onClick={() => setRefundOpen(true)}>
              <RotateCcw className="me-2 h-4 w-4" /> Refund
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('payments.detail.info')}</CardTitle>
            <Badge variant={STATUS_COLORS[payment.status] ?? 'outline'}>
              {STATUS_LABELS[payment.status] ?? payment.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{t('payments.detail.amount')}</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(payment.amount, payment.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('payments.detail.method')}</p>
                <p className="font-medium">
                  {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('payments.detail.invoice')}</p>
                <p className="font-medium">{invoiceNumber(payment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('payments.detail.receivedAt')}</p>
                <p className="font-medium">{fmtDate(payment.receivedAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('payments.detail.created')}</p>
                <p className="font-medium">{fmtDate(payment.createdAt)}</p>
              </div>
              {payment.paymentReference && (
                <div>
                  <p className="text-muted-foreground">{t('payments.detail.reference')}</p>
                  <p className="font-medium">{payment.paymentReference}</p>
                </div>
              )}
            </div>

            {(payment.last4 || payment.cardBrand) && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {payment.cardBrand && (
                    <div>
                      <p className="text-muted-foreground">{t('payments.detail.cardBrand')}</p>
                      <p className="font-medium">{payment.cardBrand}</p>
                    </div>
                  )}
                  {payment.last4 && (
                    <div>
                      <p className="text-muted-foreground">{t('payments.detail.lastFourDigits')}</p>
                      <p className="font-medium">•••• {payment.last4}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {payment.status === 'refunded' && (
              <>
                <Separator />
                <div className="rounded-md bg-destructive/10 p-3 text-sm">
                  <p className="font-semibold text-destructive">
                    {t('payments.detail.refundedLabel')}
                  </p>
                  {payment.refundedAt && (
                    <p className="text-muted-foreground">
                      Refunded on {fmtDate(payment.refundedAt)}
                    </p>
                  )}
                  {payment.refundReason && (
                    <p className="text-muted-foreground">Reason: {payment.refundReason}</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notes sidebar */}
        {payment.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('payments.detail.notes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-wrap">{payment.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payments.detail.refundButton')}</DialogTitle>
            <DialogDescription>{t('payments.detail.refundPrompt')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refundReason">{t('payments.detail.reason')}</Label>
            <Input
              id="refundReason"
              placeholder={t('payments.detail.reasonPlaceholder')}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              {t('payments.detail.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={!refundReason.trim() || refundMutation.isPending}
            >
              {refundMutation.isPending
                ? t('payments.detail.refunding')
                : t('payments.detail.confirmRefund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
