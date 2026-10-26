/**
 * Invoice Detail Page — per DENTO_V2_MASTER_PLAN.md §12 (Billing & Invoicing).
 * Shows invoice header, line items, payment history, and status actions.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  useInvoiceDetail,
  useIssueInvoice,
  useCancelInvoice,
  useRefundInvoice,
  type Invoice,
} from '../hooks/useInvoices.js';
import { formatDate } from '@/lib/date.js';
import { useBrandingStore } from '@/stores/branding.store.js';
import { useDirectUpload } from '@/features/uploads/hooks/useUpload.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  toast,
} from '@dento/ui';
import {
  ArrowLeft,
  SendHorizontal,
  XCircle,
  CreditCard,
  Printer,
  MessageCircle,
  Pencil,
  Undo2,
} from 'lucide-react';
import InvoicePDF, {
  generateInvoicePdfBlob,
  getInvoicePdfLabels,
} from '../components/InvoicePDF.js';
import { printPdfBlob } from '@/lib/print.js';
import { InvoiceStatusBadge } from '../components/InvoiceStatusBadge.js';
import { formatCurrency, getDefaultCurrency } from '@/lib/currency.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Helpers ────────────────────────────────────────────────

function patientName(inv: Invoice): string {
  if (typeof inv.patientId === 'object' && inv.patientId) {
    const p = inv.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(inv.patientId);
}

// ── Component ──────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const branding = useBrandingStore();
  const { t } = useTranslation();

  const { data: invoice, isLoading, isError, error, refetch } = useInvoiceDetail(id!);

  const issueMutation = useIssueInvoice();
  const cancelMutation = useCancelInvoice();
  const refundMutation = useRefundInvoice(id!);
  const { upload, isUploading } = useDirectUpload();

  // Phase 7.4 — refund dialog state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
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

  if (isError || !invoice) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load invoice"
          message={error?.message ?? 'Invoice not found'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const handleIssue = async () => {
    try {
      await issueMutation.mutateAsync(invoice._id);
      toast.success(t('invoices.detail.toast.issued'));
    } catch {
      toast.error(t('invoices.detail.toast.issueFailed'));
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(invoice._id);
      toast.success(t('invoices.detail.toast.cancelled'));
    } catch {
      toast.error(t('invoices.detail.toast.cancelFailed'));
    }
  };

  const handleRefund = async () => {
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid refund amount');
      return;
    }
    if (amount > invoice.amountPaid) {
      toast.error('Amount exceeds amount paid');
      return;
    }
    if (!refundReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await refundMutation.mutateAsync({ amount, reason: refundReason.trim() });
      toast.success('Refund processed');
      setRefundOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refund failed');
    }
  };

  const fmtDate = (d?: string) => (d ? formatDate(d) : '—');
  const cur = invoice.currency ?? getDefaultCurrency();

  const clinicName = branding.clinicName?.en || 'Dento Clinic';
  const clinicAddress = branding.address?.main?.en || '';
  const clinicPhone = branding.phone || '';
  const logoUrl = branding.logoUrl || branding.logoDarkUrl;

  const normalizePhone = (phone: string): string => phone.replace(/[^\d+]/g, '');

  const handleWhatsApp = async () => {
    const patient = typeof invoice.patientId === 'object' ? invoice.patientId : null;
    const patientPhone = patient?.phone;

    if (!patientPhone) {
      toast.error('Patient phone is missing');
      return;
    }

    try {
      const labels = getInvoicePdfLabels(t);
      const blob = await generateInvoicePdfBlob({
        invoice,
        clinicName,
        clinicAddress,
        clinicPhone,
        logoUrl,
        labels,
      });

      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, {
        type: 'application/pdf',
      });

      const uploaded = await upload(file, 'document');
      const msg = encodeURIComponent(
        `Invoice ${invoice.invoiceNumber} for ${patientName(invoice)}: ${uploaded.url}`,
      );

      window.open(`https://wa.me/${normalizePhone(patientPhone)}?text=${msg}`, '_blank');
      toast.success('WhatsApp message prepared with invoice PDF link');
    } catch {
      toast.error('Failed to prepare invoice for WhatsApp');
    }
  };

  const handlePrint = async () => {
    try {
      const labels = getInvoicePdfLabels(t);
      const blob = await generateInvoicePdfBlob({
        invoice,
        clinicName,
        clinicAddress,
        clinicPhone,
        logoUrl,
        labels,
      });
      await printPdfBlob(blob);
    } catch {
      toast.error('Failed to prepare invoice PDF for printing');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title={t('invoices.detail.title', { number: invoice.invoiceNumber })}
        description={t('invoices.detail.description', { name: patientName(invoice) })}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t('invoices.detail.actions.back')}
          </Button>
          <InvoicePDF
            invoice={invoice}
            clinicName={clinicName}
            clinicAddress={clinicAddress}
            clinicPhone={clinicPhone}
            logoUrl={logoUrl}
          />
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="me-2 h-4 w-4" />
            {t('invoices.detail.actions.print')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isUploading}>
            <MessageCircle className="me-2 h-4 w-4" />
            {isUploading ? 'Preparing...' : 'Send WhatsApp'}
          </Button>
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/${invoice._id}/edit`)}
            >
              <Pencil className="me-2 h-4 w-4" />
              {t('invoices.detail.actions.edit')}
            </Button>
          )}
          {invoice.status === 'draft' && (
            <Button size="sm" onClick={handleIssue}>
              <SendHorizontal className="me-2 h-4 w-4" />
              {t('invoices.detail.actions.issue')}
            </Button>
          )}
          {(invoice.status === 'issued' || invoice.status === 'partially_paid') && (
            <Button size="sm" onClick={() => navigate(`/payments/new?invoiceId=${invoice._id}`)}>
              <CreditCard className="me-2 h-4 w-4" />
              {t('invoices.detail.actions.recordPayment')}
            </Button>
          )}
          {(invoice.status === 'paid' || invoice.status === 'partially_paid') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefundAmount(String(invoice.amountPaid));
                setRefundReason('');
                setRefundOpen(true);
              }}
            >
              <Undo2 className="me-2 h-4 w-4" />
              {t('invoices.detail.actions.refund')}
            </Button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'issued') && (
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <XCircle className="me-2 h-4 w-4" />
              {t('invoices.detail.actions.cancel')}
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invoice Summary Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {t('invoices.detail.sections.invoiceDetails')}
            </CardTitle>
            <InvoiceStatusBadge status={invoice.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Clinic Info */}
            {clinicName && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-semibold">{clinicName}</p>
                {clinicAddress && <p className="text-muted-foreground">{clinicAddress}</p>}
                {clinicPhone && <p className="text-muted-foreground">{clinicPhone}</p>}
              </div>
            )}

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-muted-foreground">{t('invoices.detail.labels.issueDate')}</p>
                <p className="font-medium">{fmtDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('invoices.detail.labels.dueDate')}</p>
                <p className="font-medium">{fmtDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('invoices.detail.labels.created')}</p>
                <p className="font-medium">{fmtDate(invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('invoices.detail.labels.currency')}</p>
                <p className="font-medium">{cur}</p>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div>
              <h4 className="mb-3 text-sm font-semibold">
                {t('invoices.detail.sections.lineItems')}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-start">
                      <th className="pb-2 font-medium">
                        {t('invoices.detail.columns.description')}
                      </th>
                      <th className="pb-2 text-center font-medium">
                        {t('invoices.detail.columns.tooth')}
                      </th>
                      <th className="pb-2 text-end font-medium">
                        {t('invoices.detail.columns.qty')}
                      </th>
                      <th className="pb-2 text-end font-medium">
                        {t('invoices.detail.columns.unitPrice')}
                      </th>
                      <th className="pb-2 text-end font-medium">
                        {t('invoices.detail.columns.discount')}
                      </th>
                      <th className="pb-2 text-end font-medium">
                        {t('invoices.detail.columns.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).map((item, idx) => (
                      <tr key={item._id ?? idx} className="border-b last:border-0">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-center">
                          {item.toothNumber ? `#${item.toothNumber}` : '—'}
                        </td>
                        <td className="py-2 text-end">{item.quantity}</td>
                        <td className="py-2 text-end">{formatCurrency(item.unitPrice, cur)}</td>
                        <td className="py-2 text-end">{formatCurrency(item.discount, cur)}</td>
                        <td className="py-2 text-end font-medium">
                          {formatCurrency(item.total, cur)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('invoices.detail.totals.subtotal')}
                </span>
                <span>{formatCurrency(invoice.subtotal, cur)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('invoices.detail.totals.discount')}
                    {invoice.discountPercentage ? ` (${invoice.discountPercentage}%)` : ''}
                  </span>
                  <span className="text-destructive">
                    -{formatCurrency(invoice.discountAmount, cur)}
                  </span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('invoices.detail.totals.tax')}
                    {invoice.taxPercentage ? ` (${invoice.taxPercentage}%)` : ''}
                  </span>
                  <span>{formatCurrency(invoice.taxAmount, cur)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>{t('invoices.detail.totals.total')}</span>
                <span>{formatCurrency(invoice.totalAmount, cur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('invoices.detail.totals.amountPaid')}
                </span>
                <span className="text-green-600">{formatCurrency(invoice.amountPaid, cur)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t('invoices.detail.totals.balanceDue')}</span>
                <span className={invoice.balanceDue > 0 ? 'text-destructive' : ''}>
                  {formatCurrency(invoice.balanceDue, cur)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes / Terms Sidebar */}
        <div className="space-y-4">
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('invoices.detail.other.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
          {invoice.terms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t('invoices.detail.other.termsAndConditions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </CardContent>
            </Card>
          )}
          {invoice.insuredAmount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('invoices.detail.sections.insurance')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('invoices.detail.other.insuredAmount')}
                  </span>
                  <span>{formatCurrency(invoice.insuredAmount, cur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('invoices.detail.other.patientResponsibility')}
                  </span>
                  <span>{formatCurrency(invoice.patientResponsibility, cur)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Phase 7.4 — Refund dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice total</span>
                <span>{formatCurrency(invoice.totalAmount, cur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span>{formatCurrency(invoice.amountPaid, cur)}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="refund-amount">Refund amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0.01}
                step={0.01}
                max={invoice.amountPaid}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="refund-reason">Reason</Label>
              <Input
                id="refund-reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. cancelled treatment"
                maxLength={500}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Refunds are applied to completed payments newest-first. The amount must match the
              total of one or more full payments exactly.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefund} disabled={refundMutation.isPending}>
              {refundMutation.isPending ? 'Processing…' : 'Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
