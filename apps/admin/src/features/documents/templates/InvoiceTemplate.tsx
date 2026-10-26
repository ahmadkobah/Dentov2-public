/**
 * Invoice Document Template
 *
 * Per DENTO_V2_MASTER_PLAN.md §15 — Document Templates
 * Uses <ClinicHeader /> for unified branding
 * Reference: INV-XXXX
 */

import { ClinicHeader } from '@dento/ui';
import type { ClinicHeaderBranding } from '@dento/ui';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

export interface InvoiceItem {
  description: string;
  tooth?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  patient: {
    name: string;
    phone?: string;
    fileNumber?: string;
  };
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  paymentMethod?: string;
}

interface InvoiceTemplateProps {
  branding: ClinicHeaderBranding;
  data: InvoiceData;
}

export function InvoiceTemplate({ branding, data }: InvoiceTemplateProps) {
  const { t } = useTranslation();

  return (
    <div className="invoice-template mx-auto max-w-[210mm] bg-white p-8 text-sm print:p-0">
      {/* Header */}
      <ClinicHeader branding={branding} />

      {/* Invoice Meta */}
      <div className="mt-6 flex justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">{t('documents.invoice.title')}</h2>
          <p className="text-gray-600">{data.invoiceNumber}</p>
        </div>
        <div className="text-end text-gray-600">
          <p>
            {t('documents.invoice.date')} {data.date}
          </p>
          {data.dueDate && (
            <p>
              {t('documents.invoice.due')} {data.dueDate}
            </p>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <div className="mt-4 rounded bg-gray-50 p-3">
        <p className="font-semibold">{t('documents.invoice.billTo')}</p>
        <p>{data.patient.name}</p>
        {data.patient.phone && <p className="text-gray-600">{data.patient.phone}</p>}
        {data.patient.fileNumber && (
          <p className="text-gray-600">
            {t('documents.invoice.fileNumber')} {data.patient.fileNumber}
          </p>
        )}
      </div>

      {/* Items Table */}
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-300 text-start">
            <th className="py-2">{t('documents.invoice.columns.description')}</th>
            <th className="py-2 text-center">{t('documents.invoice.columns.tooth')}</th>
            <th className="py-2 text-center">{t('documents.invoice.columns.qty')}</th>
            <th className="py-2 text-end">{t('documents.invoice.columns.unitPrice')}</th>
            <th className="py-2 text-end">{t('documents.invoice.columns.discount')}</th>
            <th className="py-2 text-end">{t('documents.invoice.columns.total')}</th>
          </tr>
        </thead>
        <tbody>
          {(data.items ?? []).map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-center">{item.tooth ?? '—'}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-end">{formatCurrency(item.unitPrice)}</td>
              <td className="py-2 text-end">
                {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
              </td>
              <td className="py-2 text-end">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-4 flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>{t('documents.invoice.totals.subtotal')}</span>
            <span>{formatCurrency(data.subtotal)}</span>
          </div>
          {data.discount > 0 && (
            <div className="flex justify-between py-1 text-green-600">
              <span>{t('documents.invoice.totals.discount')}</span>
              <span>-{formatCurrency(data.discount)}</span>
            </div>
          )}
          {data.tax > 0 && (
            <div className="flex justify-between py-1">
              <span>{t('documents.invoice.totals.tax')}</span>
              <span>{formatCurrency(data.tax)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 py-2 text-lg font-bold">
            <span>{t('documents.invoice.totals.total')}</span>
            <span>{formatCurrency(data.total)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>{t('documents.invoice.totals.amountPaid')}</span>
            <span>{formatCurrency(data.amountPaid)}</span>
          </div>
          {data.balance > 0 && (
            <div className="flex justify-between py-1 font-semibold text-red-600">
              <span>{t('documents.invoice.totals.balanceDue')}</span>
              <span>{formatCurrency(data.balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-6 rounded bg-gray-50 p-3 text-sm text-gray-600">
          <p className="font-semibold">{t('documents.invoice.notes')}</p>
          <p>{data.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t pt-4 text-center text-xs text-gray-400">
        <p>{t('documents.invoice.thankYou', { clinicName: branding.clinicName.en })}</p>
      </div>
    </div>
  );
}
