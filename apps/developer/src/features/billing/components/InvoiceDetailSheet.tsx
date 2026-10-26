import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Button,
  Separator,
  SaaSInvoiceDownloadButton,
  defaultSaaSInvoicePdfLabels,
  type SaaSInvoiceForPdf,
} from '@dento/ui';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import type { SaaSInvoiceStatus } from '@dento/shared';
import { useSaaSInvoiceDetail, useSendReminder } from '../hooks/useBilling.js';
import { formatDateShort as formatDate } from '../../../lib/date.js';
import { formatCurrency } from '../../../lib/currency.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const statusVariant: Record<
  SaaSInvoiceStatus,
  'default' | 'secondary' | 'warning' | 'destructive'
> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  partially_paid: 'warning',
  overdue: 'destructive',
  cancelled: 'secondary',
  refunded: 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface InvoiceDetailDialogProps {
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoiceDetailDialog({ invoiceId, onClose }: InvoiceDetailDialogProps) {
  const { data: invoice, isLoading, isError } = useSaaSInvoiceDetail(invoiceId);
  const sendReminder = useSendReminder();

  const canRemind = invoice?.status === 'overdue' || invoice?.status === 'issued';

  return (
    <Dialog open={!!invoiceId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Detail</DialogTitle>
          <DialogDescription>
            {invoice ? `${invoice.invoiceNumber} — ${invoice.tenantName}` : 'Loading…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-gray-500">Failed to load invoice details.</p>
          </div>
        )}

        {invoice && (
          <div className="mt-6 space-y-5">
            {/* Status + Reminder + Download */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={statusVariant[invoice.status]} className="text-sm capitalize">
                {invoice.status.replace('_', ' ')}
              </Badge>
              {canRemind && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sendReminder.isPending}
                  onClick={() => {
                    sendReminder.mutate(invoice._id);
                  }}
                >
                  <Send className="me-1.5 h-4 w-4" />
                  Send Reminder
                </Button>
              )}
              <SaaSInvoiceDownloadButton
                invoice={invoice as unknown as SaaSInvoiceForPdf}
                tenant={{
                  name: invoice.tenantName ?? 'Tenant',
                  email: invoice.tenantContact?.email,
                  phone: invoice.tenantContact?.phone,
                  address: invoice.tenantContact?.address,
                }}
                platform={{
                  name: 'Dento Platform',
                  email: 'billing@dento.app',
                  website: 'https://dento.app',
                }}
                labels={defaultSaaSInvoicePdfLabels()}
              />
            </div>

            <Separator />

            {/* Overview */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-medium text-gray-500">Invoice #</p>
                <p className="font-mono">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Tenant</p>
                <p className="font-medium">{invoice.tenantName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Source</p>
                <p className="capitalize">{invoice.source}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="font-semibold">{formatCurrency(invoice.total, invoice.currency)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Period</p>
                <p>
                  {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Due Date</p>
                <p>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Paid At</p>
                  <p>{formatDate(invoice.paidAt)}</p>
                </div>
              )}
              {invoice.balanceDue > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500">Balance Due</p>
                  <p className="font-semibold text-destructive">
                    {formatCurrency(invoice.balanceDue, invoice.currency)}
                  </p>
                </div>
              )}
            </div>

            {/* Line Items */}
            {invoice.items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Line Items</p>
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="px-3 py-2 text-start text-xs font-medium text-gray-500">
                            Description
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-end text-xs font-medium text-gray-500">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-end">{item.quantity}</td>
                            <td className="px-3 py-2 text-end font-mono">
                              {formatCurrency(item.unitPrice, invoice.currency)}
                            </td>
                            <td className="px-3 py-2 text-end font-mono font-medium">
                              {formatCurrency(item.total, invoice.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-gray-500">Notes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.notes}</p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
