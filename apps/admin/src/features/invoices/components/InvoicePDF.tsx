/**
 * Invoice PDF — per DENTO_V2_MASTER_PLAN.md §12 / TECH_REQUIREMENTS.md §PDF.
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Renders branded invoice with line items, totals, and clinic info.
 */

import {
  Document,
  Image,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  pdf,
} from '@react-pdf/renderer';
import type { Invoice, InvoiceItem } from '../hooks/useInvoices.js';
import { Button } from '@dento/ui';
import { Download } from 'lucide-react';
import { formatCurrency as fmtCurrency, getDefaultCurrency } from '@/lib/currency.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  pageRtl: {
    textAlign: 'right',
  },
  clinicHeader: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 10,
  },
  clinicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  logoBox: {
    width: 56,
    height: 56,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 10,
    color: '#64748b',
  },
  logoImage: {
    width: 56,
    height: 56,
    objectFit: 'contain',
  },
  clinicInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  clinicInfoRtl: {
    alignItems: 'flex-start',
  },
  clinicName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  clinicLine: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    width: 100,
    color: '#64748b',
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 20,
    color: '#0f172a',
  },
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  colDesc: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTax: { flex: 1.2, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 3,
  },
  summaryLabel: {
    width: 120,
    textAlign: 'right',
    color: '#64748b',
    marginRight: 12,
  },
  summaryLabelRtl: {
    marginRight: 0,
    marginLeft: 12,
    textAlign: 'left',
  },
  summaryValue: {
    width: 80,
    textAlign: 'right',
  },
  summaryValueRtl: {
    textAlign: 'left',
  },
  summaryTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
  },
  notes: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 9,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#94a3b8',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
});

// ── Helpers ────────────────────────────────────────────────

function fmtDate(d?: string): string {
  return d ? formatDate(d) : '—';
}

function patientName(inv: Invoice): string {
  if (typeof inv.patientId === 'object' && inv.patientId) {
    const p = inv.patientId;
    return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode;
  }
  return String(inv.patientId);
}

function statusColor(status: string): string {
  switch (status) {
    case 'paid':
      return '#16a34a';
    case 'issued':
      return '#2563eb';
    case 'installment':
      return '#8b5cf6';
    case 'overdue':
    case 'cancelled':
      return '#dc2626';
    case 'partially_paid':
      return '#f59e0b';
    default:
      return '#64748b';
  }
}

// ── PDF Document ───────────────────────────────────────────

export interface InvoicePDFDocProps {
  invoice: Invoice;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string | null;
  labels: Record<string, string>;
  isRTL?: boolean;
}

export function InvoicePDFDoc({
  invoice,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  labels,
  isRTL = false,
}: InvoicePDFDocProps) {
  const cur = invoice.currency ?? getDefaultCurrency();

  return (
    <Document>
      <Page size="A4" style={[styles.page, isRTL ? styles.pageRtl : {}]}>
        {/* Clinic header: logo left, clinic info right */}
        <View style={styles.clinicHeader}>
          <View style={[styles.clinicTop, isRTL ? styles.rowReverse : {}]}>
            <View style={styles.logoBox}>
              {logoUrl ? (
                <Image src={logoUrl} style={styles.logoImage} />
              ) : (
                <Text style={styles.logoText}>Logo</Text>
              )}
            </View>
            <View style={[styles.clinicInfo, isRTL ? styles.clinicInfoRtl : {}]}>
              <Text style={styles.clinicName}>{clinicName || 'Dento Clinic'}</Text>
              {!!clinicAddress && <Text style={styles.clinicLine}>{clinicAddress}</Text>}
              {!!clinicPhone && <Text style={styles.clinicLine}>{clinicPhone}</Text>}
            </View>
          </View>
        </View>

        {/* Invoice title + status badge */}
        <View style={[styles.titleRow, isRTL ? styles.rowReverse : {}]}>
          <View>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.subtitle}>{invoice.invoiceNumber}</Text>
          </View>
          <Text
            style={[
              styles.badge,
              {
                backgroundColor: statusColor(invoice.status) + '20',
                color: statusColor(invoice.status),
              },
            ]}
          >
            {invoice.status.replace('_', ' ')}
          </Text>
        </View>

        {/* Meta */}
        <View style={{ marginBottom: 16 }}>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>{labels.patient}</Text>
            <Text style={styles.metaValue}>{patientName(invoice)}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>{labels.issueDate}</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>{labels.dueDate}</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.dueDate)}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>{labels.currency}</Text>
            <Text style={styles.metaValue}>{cur}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <Text style={styles.sectionTitle}>{labels.itemsTitle}</Text>
        <View style={styles.table}>
          <View style={[styles.tableHeader, isRTL ? styles.rowReverse : {}]}>
            <Text style={[styles.headerText, styles.colDesc]}>{labels.colDescription}</Text>
            <Text style={[styles.headerText, styles.colQty]}>{labels.colQty}</Text>
            <Text style={[styles.headerText, styles.colPrice]}>{labels.colUnitPrice}</Text>
            <Text style={[styles.headerText, styles.colTax]}>{labels.colTax}</Text>
            <Text style={[styles.headerText, styles.colTotal]}>{labels.colTotal}</Text>
          </View>
          {(invoice.items ?? []).map((item: InvoiceItem, idx: number) => (
            <View key={item._id ?? idx} style={[styles.tableRow, isRTL ? styles.rowReverse : {}]}>
              <Text style={styles.colDesc}>
                {item.description}
                {item.toothNumber ? ` (Tooth #${item.toothNumber})` : ''}
              </Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{fmtCurrency(item.unitPrice, cur)}</Text>
              <Text style={styles.colTax}>
                {invoice.taxPercentage ? `${invoice.taxPercentage}%` : '—'}
              </Text>
              <Text style={styles.colTotal}>{fmtCurrency(item.total, cur)}</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ marginTop: 16 }}>
          <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
              {labels.subtotal}
            </Text>
            <Text style={[styles.summaryValue, isRTL ? styles.summaryValueRtl : {}]}>
              {fmtCurrency(invoice.subtotal, cur)}
            </Text>
          </View>
          {invoice.discountAmount > 0 && (
            <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
              <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
                {labels.discount}
                {invoice.discountPercentage ? ` (${invoice.discountPercentage}%)` : ''}
              </Text>
              <Text
                style={[
                  styles.summaryValue,
                  isRTL ? styles.summaryValueRtl : {},
                  { color: '#dc2626' },
                ]}
              >
                -{fmtCurrency(invoice.discountAmount, cur)}
              </Text>
            </View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
              <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
                {labels.tax}
                {invoice.taxPercentage ? ` (${invoice.taxPercentage}%)` : ''}
              </Text>
              <Text style={[styles.summaryValue, isRTL ? styles.summaryValueRtl : {}]}>
                {fmtCurrency(invoice.taxAmount, cur)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.summaryRow,
              isRTL ? styles.rowReverse : {},
              { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
            ]}
          >
            <Text
              style={[
                styles.summaryLabel,
                isRTL ? styles.summaryLabelRtl : {},
                styles.summaryTotal,
              ]}
            >
              {labels.total}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                isRTL ? styles.summaryValueRtl : {},
                styles.summaryTotal,
              ]}
            >
              {fmtCurrency(invoice.totalAmount, cur)}
            </Text>
          </View>
          <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
              {labels.amountPaid}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                isRTL ? styles.summaryValueRtl : {},
                { color: '#16a34a' },
              ]}
            >
              {fmtCurrency(invoice.amountPaid, cur)}
            </Text>
          </View>
          <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
            <Text
              style={[
                styles.summaryLabel,
                isRTL ? styles.summaryLabelRtl : {},
                { fontFamily: 'Helvetica-Bold' },
              ]}
            >
              {labels.balanceDue}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                isRTL ? styles.summaryValueRtl : {},
                {
                  fontFamily: 'Helvetica-Bold',
                  color: invoice.balanceDue > 0 ? '#dc2626' : '#16a34a',
                },
              ]}
            >
              {fmtCurrency(invoice.balanceDue, cur)}
            </Text>
          </View>
        </View>

        {/* Insurance */}
        {invoice.insuredAmount > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>{labels.insurance}</Text>
            <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
              <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
                {labels.insuredAmount}
              </Text>
              <Text style={[styles.summaryValue, isRTL ? styles.summaryValueRtl : {}]}>
                {fmtCurrency(invoice.insuredAmount, cur)}
              </Text>
            </View>
            <View style={[styles.summaryRow, isRTL ? styles.rowReverse : {}]}>
              <Text style={[styles.summaryLabel, isRTL ? styles.summaryLabelRtl : {}]}>
                {labels.patientResponsibility}
              </Text>
              <Text style={[styles.summaryValue, isRTL ? styles.summaryValueRtl : {}]}>
                {fmtCurrency(invoice.patientResponsibility, cur)}
              </Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.notes}>
            {invoice.notes && (
              <View style={{ marginBottom: invoice.terms ? 8 : 0 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                  {labels.notes}
                </Text>
                <Text>{invoice.notes}</Text>
              </View>
            )}
            {invoice.terms && (
              <View>
                <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                  {labels.termsAndConditions}
                </Text>
                <Text>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            [clinicName, clinicAddress, clinicPhone]
              .filter(Boolean)
              .concat([`Page ${pageNumber} of ${totalPages}`])
              .join(' | ')
          }
        />
      </Page>
    </Document>
  );
}

export function getInvoicePdfLabels(t: (key: string) => string): Record<string, string> {
  return {
    title: t('invoices.pdf.title'),
    patient: t('invoices.pdf.patient'),
    issueDate: t('invoices.pdf.issueDate'),
    dueDate: t('invoices.pdf.dueDate'),
    currency: t('invoices.pdf.currency'),
    itemsTitle: t('invoices.pdf.itemsTitle'),
    colDescription: t('invoices.pdf.columns.description'),
    colQty: t('invoices.pdf.columns.qty'),
    colUnitPrice: t('invoices.pdf.columns.unitPrice'),
    colTax: t('invoices.pdf.columns.tax'),
    colTotal: t('invoices.pdf.columns.total'),
    subtotal: t('invoices.pdf.totals.subtotal'),
    discount: t('invoices.pdf.totals.discount'),
    tax: t('invoices.pdf.totals.tax'),
    total: t('invoices.pdf.totals.total'),
    amountPaid: t('invoices.pdf.totals.amountPaid'),
    balanceDue: t('invoices.pdf.totals.balanceDue'),
    insurance: t('invoices.pdf.insurance.title'),
    insuredAmount: t('invoices.pdf.insurance.insuredAmount'),
    patientResponsibility: t('invoices.pdf.insurance.patientResponsibility'),
    notes: t('invoices.pdf.notes'),
    termsAndConditions: t('invoices.pdf.termsAndConditions'),
    generatedOn: t('invoices.pdf.generatedOn'),
    downloadPdf: t('invoices.pdf.downloadPdf'),
    generating: t('invoices.pdf.generating'),
  };
}

export async function generateInvoicePdfBlob(props: InvoicePDFDocProps): Promise<Blob> {
  return pdf(<InvoicePDFDoc {...props} />).toBlob();
}

// ── Download Button ────────────────────────────────────────

interface InvoicePDFProps {
  invoice: Invoice;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string | null;
}

export default function InvoicePDF({
  invoice,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
}: InvoicePDFProps) {
  const { t, isRTL } = useTranslation();
  const labels = getInvoicePdfLabels(t);

  return (
    <PDFDownloadLink
      document={
        <InvoicePDFDoc
          invoice={invoice}
          clinicName={clinicName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
          logoUrl={logoUrl}
          labels={labels}
          isRTL={isRTL}
        />
      }
      fileName={`${invoice.invoiceNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? labels.generating : labels.downloadPdf}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
