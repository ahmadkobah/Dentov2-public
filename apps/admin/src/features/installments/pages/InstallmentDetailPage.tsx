/**
 * Installment Detail Page — per DENTO_V2_MASTER_PLAN.md §12.
 * Shows plan overview, payment schedule table, record-payment actions.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useInstallmentDetail,
  useRecordInstallmentPayment,
  useCancelInstallment,
  useWaiveInstallment,
  type InstallmentPlan,
} from '../hooks/useInstallments.js';
import { formatDate } from '@/lib/date.js';
import { formatCurrency } from '@/lib/currency.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  User,
  Receipt,
  Calendar,
  Ban,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';
import { RecordInstallmentPaymentDialog } from '../components/RecordInstallmentPaymentDialog.js';

// ── Status config ──────────────────────────────────────

const PLAN_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  defaulted: 'destructive',
  cancelled: 'outline',
};

const PAYMENT_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  paid: 'default',
  overdue: 'destructive',
  partially_paid: 'secondary',
};

function patientName(plan: InstallmentPlan): string {
  if (typeof plan.patientId === 'object' && plan.patientId) {
    const p = plan.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(plan.patientId);
}

// ── Component ──────────────────────────────────────────

export default function InstallmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: plan, isLoading, isError, error, refetch } = useInstallmentDetail(id!);
  const paymentMutation = useRecordInstallmentPayment();
  const cancelMutation = useCancelInstallment();
  const waiveMutation = useWaiveInstallment();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean;
    paymentIndex: number;
    installmentNumber: number;
    dueAmount: number;
    paidAmount: number;
  }>({ open: false, paymentIndex: 0, installmentNumber: 1, dueAmount: 0, paidAmount: 0 });

  const handleRecordPayment = async (paymentIndex: number, amount: number) => {
    if (!id) return;
    try {
      await paymentMutation.mutateAsync({ planId: id, paymentIndex, amount });
      toast.success(t('installments.toast.paymentRecorded'));
    } catch {
      toast.error(t('installments.toast.paymentRecordFailed'));
    }
  };

  const handleWaivePayment = async (paymentIndex: number) => {
    if (!id) return;
    try {
      await waiveMutation.mutateAsync({ planId: id, paymentIndex });
      toast.success(t('installments.toast.paymentWaived'));
    } catch {
      toast.error(t('installments.toast.paymentWaiveFailed'));
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success(t('installments.toast.planCancelled'));
    } catch {
      toast.error(t('installments.toast.planCancelFailed'));
    } finally {
      setCancelOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="p-6">
        <ErrorState
          title={t('installments.error.loadFailed')}
          message={error?.message ?? 'Plan not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const paidCount = plan.payments.filter((p) => p.status === 'paid').length;
  const progressPct = Math.round((paidCount / plan.numberOfInstallments) * 100);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={`Plan #${plan._id.slice(-6).toUpperCase()}`}
        description={`Started ${formatDate(plan.payments?.[0]?.dueDate ?? plan.createdAt)}`}
      >
        <div className="flex items-center gap-3">
          <Badge variant={PLAN_STATUS_COLORS[plan.status] ?? 'outline'} className="text-sm">
            {t(`installments.status.${plan.status}`) || plan.status}
          </Badge>
          {plan.status === 'active' && (
            <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
              <XCircle className="me-2 h-4 w-4" />
              {t('installments.actions.cancelPlan')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/installments')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('installments.actions.back')}
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Patient Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t('installments.detail.cards.patient')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <span className="text-sm font-medium">{patientName(plan)}</span>
          </CardContent>
        </Card>

        {/* Financials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              {t('installments.detail.cards.financials')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('installments.detail.labels.total')}
              </span>
              <span className="text-sm font-medium">{formatCurrency(plan.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('installments.detail.labels.downPayment')}
              </span>
              <span className="text-sm">{formatCurrency(plan.downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('installments.detail.labels.remaining')}
              </span>
              <span className="text-destructive text-sm font-semibold">
                {formatCurrency(plan.remainingAmount)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              {t('installments.detail.cards.progress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('installments.detail.labels.payments')}
              </span>
              <span className="text-sm font-medium">
                {paidCount} / {plan.numberOfInstallments}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">
                {t('installments.detail.labels.frequency')}
              </span>
              <span className="text-sm">{plan.frequency}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('installments.detail.paymentSchedule')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start">
                  <th className="pb-2 pe-4 font-medium">
                    {t('installments.detail.scheduleColumns.number')}
                  </th>
                  <th className="pb-2 pe-4 font-medium">
                    {t('installments.detail.scheduleColumns.dueDate')}
                  </th>
                  <th className="pb-2 pe-4 text-end font-medium">
                    {t('installments.detail.scheduleColumns.amount')}
                  </th>
                  <th className="pb-2 pe-4 text-end font-medium">
                    {t('installments.detail.scheduleColumns.paid')}
                  </th>
                  <th className="pb-2 pe-4 font-medium">
                    {t('installments.detail.scheduleColumns.status')}
                  </th>
                  <th className="pb-2 pe-4 font-medium">
                    {t('installments.detail.scheduleColumns.timeliness')}
                  </th>
                  <th className="pb-2 font-medium">
                    {t('installments.detail.scheduleColumns.action')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {plan.payments.map((payment, idx) => {
                  const dueDate = new Date(payment.dueDate);
                  const now = new Date();
                  const isPastDue =
                    dueDate < now && payment.status !== 'paid' && payment.status !== 'waived';

                  return (
                    <tr key={payment._id || idx} className="border-b last:border-0">
                      <td className="py-3 pe-4 text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 pe-4">
                        <span className={isPastDue ? 'text-destructive font-medium' : ''}>
                          {formatDate(payment.dueDate)}
                        </span>
                      </td>
                      <td className="py-3 pe-4 text-end font-medium">
                        {formatCurrency(payment.amountDue)}
                      </td>
                      <td className="py-3 pe-4 text-end">
                        {payment.amountPaid > 0 ? (
                          <span className="font-medium text-green-600">
                            {formatCurrency(payment.amountPaid)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pe-4">
                        <Badge variant={PAYMENT_STATUS_COLORS[payment.status] ?? 'outline'}>
                          {t(`installments.paymentStatus.${payment.status.replace('_', '')}`) ||
                            payment.status}
                        </Badge>
                      </td>
                      <td className="py-3 pe-4">
                        {payment.status === 'paid' || payment.status === 'waived' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            {payment.status === 'waived'
                              ? t('installments.timeliness.waived')
                              : t('installments.timeliness.onTime')}
                          </span>
                        ) : isPastDue ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            {t('installments.timeliness.late')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {t('installments.timeliness.upcoming')}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {(payment.status === 'pending' || payment.status === 'overdue') &&
                          plan.status === 'active' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPaymentDialog({
                                    open: true,
                                    paymentIndex: idx,
                                    installmentNumber: idx + 1,
                                    dueAmount: payment.amountDue,
                                    paidAmount: payment.amountPaid,
                                  })
                                }
                                disabled={paymentMutation.isPending}
                              >
                                <CheckCircle className="me-1 h-3 w-3" />
                                {t('installments.actions.record')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleWaivePayment(idx)}
                                disabled={waiveMutation.isPending}
                              >
                                <Ban className="me-1 h-3 w-3" />
                                {t('installments.actions.waive')}
                              </Button>
                            </div>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {plan.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('installments.detail.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{plan.notes}</p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title={t('installments.dialog.cancelTitle')}
        description={t('installments.dialog.cancelDescription')}
        confirmLabel={t('installments.dialog.cancelConfirm')}
        variant="destructive"
        onConfirm={handleCancel}
      />

      <RecordInstallmentPaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog((p) => ({ ...p, open }))}
        installmentNumber={paymentDialog.installmentNumber}
        dueAmount={paymentDialog.dueAmount}
        paidAmount={paymentDialog.paidAmount}
        isPending={paymentMutation.isPending}
        onConfirm={async ({ amount }) => {
          await handleRecordPayment(paymentDialog.paymentIndex, amount);
          setPaymentDialog((p) => ({ ...p, open: false }));
        }}
      />
    </div>
  );
}
