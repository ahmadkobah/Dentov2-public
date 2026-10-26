/**
 * RecordPaymentPage — Page for recording a new payment.
 * Reads ?invoiceId query param if navigated from InvoiceDetailPage.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader, Button, toast } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { useCreatePayment } from '../hooks/usePayments.js';
import { PaymentForm } from '../components/PaymentForm.js';
import { useTranslation } from '../../../stores/locale.store.js';

export default function RecordPaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId') ?? '';

  const createMutation = useCreatePayment();

  const handleSubmit = (data: Parameters<typeof createMutation.mutate>[0]) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success(t('payments.toast.recorded'));
        navigate('/payments');
      },
      onError: (err: any) => toast.error(err?.message ?? t('payments.toast.recordFailed')),
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <PageHeader title={t('payments.record.title')} description={t('payments.record.subtitle')}>
        <Button variant="outline" size="sm" onClick={() => navigate('/payments')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> {t('payments.record.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <PaymentForm
          defaultInvoiceId={invoiceId}
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
        />
      </div>
    </div>
  );
}
