/**
 * InvoiceFormPage — Create / edit form page for invoices.
 * Uses :id param for edit mode.
 * Per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 */

import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Button, toast } from '@dento/ui';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/stores/locale.store.js';
import {
  useInvoiceDetail,
  useCreateInvoice,
  useUpdateInvoice,
  type Invoice,
} from '../hooks/useInvoices.js';
import { InvoiceForm } from '../components/InvoiceForm.js';

export default function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!id;

  const { data: invoice, isLoading, isError } = useInvoiceDetail(id ?? '');
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice(id ?? '');

  const handleSubmit = (data: Partial<Invoice>) => {
    if (isEdit) {
      // updateInvoiceSchema omits patientId & branchId (.strict())
      const { patientId, branchId, ...updateData } = data;
      updateMutation.mutate(updateData, {
        onSuccess: () => {
          toast.success(t('invoices.formPage.toast.updated'));
          navigate(`/invoices/${id}`);
        },
        onError: (err: any) =>
          toast.error(err?.message ?? t('invoices.formPage.toast.updateFailed')),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success(t('invoices.formPage.toast.created'));
          navigate('/invoices');
        },
        onError: (err: any) =>
          toast.error(err?.message ?? t('invoices.formPage.toast.createFailed')),
      });
    }
  };

  if (isEdit && isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-96 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isEdit && isError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-8 text-center text-sm text-destructive">
          {t('invoices.formPage.error.loadFailed')}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader
        title={
          isEdit
            ? t('invoices.formPage.editTitle', { number: invoice?.invoiceNumber ?? '' })
            : t('invoices.formPage.createTitle')
        }
        description={
          isEdit ? t('invoices.formPage.editDescription') : t('invoices.formPage.createDescription')
        }
      >
        <Button variant="outline" size="sm" onClick={() => navigate('/invoices')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> {t('invoices.formPage.actions.back')}
        </Button>
      </PageHeader>

      <div className="rounded-lg border bg-card p-6">
        <InvoiceForm
          defaultValues={invoice as Partial<Invoice> | undefined}
          onSubmit={handleSubmit}
          isPending={isEdit ? updateMutation.isPending : createMutation.isPending}
          mode={isEdit ? 'edit' : 'create'}
        />
      </div>
    </div>
  );
}
