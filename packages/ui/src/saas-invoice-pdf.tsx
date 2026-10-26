/**
 * SaaS Invoice PDF — Tenant ↔ Platform billing
 *
 * Used by:
 *  - apps/developer (BillingPage / InvoiceDetailSheet)  → platform finance team
 *  - apps/admin    (SubscriptionPage)                   → tenant billing admin
 *
 * Built with @react-pdf/renderer. Lives in @dento/ui so both portals share
 * one source of truth for layout, styling, and labels.
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
import { Button } from './primitives/Button.js';

// ── Public Types ───────────────────────────────────────────

export type SaaSInvoiceItemType =
  | 'module'
  | 'extra_storage'
  | 'extra_users'
  | 'extra_branches'
  | 'custom'
  | 'discount';

export interface SaaSInvoiceLineItem {
  type: SaaSInvoiceItemType;
  description: string;
  moduleSlug?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  couponCode?: string | null;
}

export interface SaaSInvoiceForPdf {
  _id: string;
  invoiceNumber: string;
  status: string; // draft | issued | paid | partially_paid | overdue | cancelled | refunded
  source?: 'manual' | 'auto';
  currency: string;

  periodStart: string;
  periodEnd: string;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;

  items: SaaSInvoiceLineItem[];

  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;

  notes?: string | null;
}

export interface SaaSInvoiceTenantInfo {
  name: string;
  legalName?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

export interface SaaSInvoicePlatformInfo {
  name: string; // e.g. "Dento Platform"
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  logoUrl?: string | null;
  bankInfo?: { bankName: string; iban: string };
  payUrl?: string; // e.g. https://app.dento.app/billing/INV-xxx
  website?: string;
}

export interface SaaSInvoicePdfLabels {
  title: string; // "TAX INVOICE"
  billTo: string;
  invoiceNumber: string;
  issued: string;
  period: string;
  due: string;
  currency: string;
  source: string;

  itemsTitle: string;
  colDescription: string;
  colType: string;
  colQty: string;
  colUnitPrice: string;
  colTotal: string;

  totalSubtotal: string;
  totalDiscount: string;
  totalTax: string;
  totalGrand: string;
  totalPaid: string;
  totalBalance: string;

  paymentMethods: string;
  bankTransfer: string;
  payOnline: string;

  notes: string;
  footer: string;
  generating: string;
  downloadPdf: string;

  typeModule: string;
  typeOverageUsers: string;
  typeOverageStorage: string;
  typeOverageBranches: string;
  typeCustom: string;
  typeDiscount: string;
}

// ── Default English labels (override per app via getSaaSInvoicePdfLabels) ─

export function defaultSaaSInvoicePdfLabels(): SaaSInvoicePdfLabels {
  return {
    title: 'TAX INVOICE',
    billTo: 'Bill To',
    invoiceNumber: 'Invoice #',
    issued: 'Issued',
    period: 'Period',
    due: 'Due',
    currency: 'Currency',
    source: 'Source',

    itemsTitle: 'Line Items',
    colDescription: 'Description',
    colType: 'Type',
    colQty: 'Qty',
    colUnitPrice: 'Unit Price',
    colTotal: 'Total',

    totalSubtotal: 'Subtotal',
    totalDiscount: 'Discounts',
    totalTax: 'Tax',
    totalGrand: 'TOTAL',
    totalPaid: 'Paid',
    totalBalance: 'Balance Due',

    paymentMethods: 'Payment Methods',
    bankTransfer: 'Bank transfer',
    payOnline: 'Pay online',

    notes: 'Notes',
    footer:
      'Powered by Dento Platform · This invoice is electronically issued and is valid without signature.',
    generating: 'Generating…',
    downloadPdf: 'Download PDF',

    typeModule: 'Module',
    typeOverageUsers: 'Extra users',
    typeOverageStorage: 'Extra storage',
    typeOverageBranches: 'Extra branches',
    typeCustom: 'Custom',
    typeDiscount: 'Discount',
  };
}

export function buildSaaSInvoicePdfLabels(t: (key: string) => string): SaaSInvoicePdfLabels {
  // Apps may pass their own translator; if a key is missing we fall back to defaults.
  const fallback = defaultSaaSInvoicePdfLabels();
  const tr = (key: string, fb: string): string => {
    try {
      const v = t(key);
      return v && v !== key ? v : fb;
    } catch {
      return fb;
    }
  };
  return {
    title: tr('saasInvoice.pdf.title', fallback.title),
    billTo: tr('saasInvoice.pdf.billTo', fallback.billTo),
    invoiceNumber: tr('saasInvoice.pdf.invoiceNumber', fallback.invoiceNumber),
    issued: tr('saasInvoice.pdf.issued', fallback.issued),
    period: tr('saasInvoice.pdf.period', fallback.period),
    due: tr('saasInvoice.pdf.due', fallback.due),
    currency: tr('saasInvoice.pdf.currency', fallback.currency),
    source: tr('saasInvoice.pdf.source', fallback.source),

    itemsTitle: tr('saasInvoice.pdf.itemsTitle', fallback.itemsTitle),
    colDescription: tr('saasInvoice.pdf.colDescription', fallback.colDescription),
    colType: tr('saasInvoice.pdf.colType', fallback.colType),
    colQty: tr('saasInvoice.pdf.colQty', fallback.colQty),
    colUnitPrice: tr('saasInvoice.pdf.colUnitPrice', fallback.colUnitPrice),
    colTotal: tr('saasInvoice.pdf.colTotal', fallback.colTotal),

    totalSubtotal: tr('saasInvoice.pdf.totalSubtotal', fallback.totalSubtotal),
    totalDiscount: tr('saasInvoice.pdf.totalDiscount', fallback.totalDiscount),
    totalTax: tr('saasInvoice.pdf.totalTax', fallback.totalTax),
    totalGrand: tr('saasInvoice.pdf.totalGrand', fallback.totalGrand),
    totalPaid: tr('saasInvoice.pdf.totalPaid', fallback.totalPaid),
    totalBalance: tr('saasInvoice.pdf.totalBalance', fallback.totalBalance),

    paymentMethods: tr('saasInvoice.pdf.paymentMethods', fallback.paymentMethods),
    bankTransfer: tr('saasInvoice.pdf.bankTransfer', fallback.bankTransfer),
    payOnline: tr('saasInvoice.pdf.payOnline', fallback.payOnline),

    notes: tr('saasInvoice.pdf.notes', fallback.notes),
    footer: tr('saasInvoice.pdf.footer', fallback.footer),
    generating: tr('saasInvoice.pdf.generating', fallback.generating),
    downloadPdf: tr('saasInvoice.pdf.downloadPdf', fallback.downloadPdf),

    typeModule: tr('saasInvoice.pdf.types.module', fallback.typeModule),
    typeOverageUsers: tr('saasInvoice.pdf.types.extraUsers', fallback.typeOverageUsers),
    typeOverageStorage: tr('saasInvoice.pdf.types.extraStorage', fallback.typeOverageStorage),
    typeOverageBranches: tr('saasInvoice.pdf.types.extraBranches', fallback.typeOverageBranches),
    typeCustom: tr('saasInvoice.pdf.types.custom', fallback.typeCustom),
    typeDiscount: tr('saasInvoice.pdf.types.discount', fallback.typeDiscount),
  };
}

// ── Styles (mirrors clinic InvoicePDF look-and-feel) ───────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 10,
    gap: 12,
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
  logoImage: {
    width: 56,
    height: 56,
    objectFit: 'contain',
  },
  logoText: { fontSize: 10, color: '#64748b' },
  platformInfo: { alignItems: 'flex-end', flex: 1 },
  platformName: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  platformLine: { fontSize: 10, color: '#475569', marginTop: 2 },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },

  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    marginBottom: 14,
  },
  column: { flex: 1 },
  columnTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: { width: 80, color: '#64748b' },
  metaValue: { fontFamily: 'Helvetica-Bold', flex: 1 },

  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 6,
    marginTop: 12,
  },

  table: { marginTop: 4 },
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
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#475569',
  },
  colDesc: { flex: 3 },
  colType: { flex: 1.4 },
  colQty: { flex: 0.8, textAlign: 'right' },
  colPrice: { flex: 1.4, textAlign: 'right' },
  colTotal: { flex: 1.4, textAlign: 'right' },

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
  summaryValue: { width: 90, textAlign: 'right' },
  summaryTotal: { fontFamily: 'Helvetica-Bold', fontSize: 13 },

  payBlock: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 9,
    color: '#334155',
  },
  payTitle: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 4,
    fontSize: 10,
  },

  notes: {
    marginTop: 12,
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

function statusColor(status: string): string {
  switch (status) {
    case 'paid':
      return '#16a34a';
    case 'issued':
      return '#2563eb';
    case 'partially_paid':
      return '#f59e0b';
    case 'overdue':
      return '#dc2626';
    case 'cancelled':
    case 'refunded':
      return '#64748b';
    default:
      return '#64748b';
  }
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

function typeLabel(t: SaaSInvoiceItemType, l: SaaSInvoicePdfLabels): string {
  switch (t) {
    case 'module':
      return l.typeModule;
    case 'extra_users':
      return l.typeOverageUsers;
    case 'extra_storage':
      return l.typeOverageStorage;
    case 'extra_branches':
      return l.typeOverageBranches;
    case 'discount':
      return l.typeDiscount;
    case 'custom':
    default:
      return l.typeCustom;
  }
}

// ── Document ───────────────────────────────────────────────

export interface SaaSInvoicePDFDocProps {
  invoice: SaaSInvoiceForPdf;
  tenant: SaaSInvoiceTenantInfo;
  platform: SaaSInvoicePlatformInfo;
  labels?: SaaSInvoicePdfLabels;
}

export function SaaSInvoicePDFDoc({
  invoice,
  tenant,
  platform,
  labels = defaultSaaSInvoicePdfLabels(),
}: SaaSInvoicePDFDocProps) {
  const cur = invoice.currency;
  const color = statusColor(invoice.status);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: logo + platform info */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            {platform.logoUrl ? (
              <Image src={platform.logoUrl} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoText}>Logo</Text>
            )}
          </View>
          <View style={styles.platformInfo}>
            <Text style={styles.platformName}>{platform.name}</Text>
            {!!platform.address && <Text style={styles.platformLine}>{platform.address}</Text>}
            {!!platform.email && <Text style={styles.platformLine}>{platform.email}</Text>}
            {!!platform.phone && <Text style={styles.platformLine}>{platform.phone}</Text>}
            {!!platform.website && <Text style={styles.platformLine}>{platform.website}</Text>}
            {!!platform.taxId && <Text style={styles.platformLine}>Tax ID: {platform.taxId}</Text>}
          </View>
        </View>

        {/* Title + status */}
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.subtitle}>{invoice.invoiceNumber}</Text>
          </View>
          <Text style={[styles.badge, { backgroundColor: color + '20', color }]}>
            {invoice.status.replace('_', ' ')}
          </Text>
        </View>

        {/* Bill-to + invoice details */}
        <View style={styles.twoCol}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{labels.billTo}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{tenant.legalName || tenant.name}</Text>
            {tenant.legalName && tenant.name && tenant.legalName !== tenant.name && (
              <Text>{tenant.name}</Text>
            )}
            {!!tenant.address && <Text>{tenant.address}</Text>}
            {!!tenant.phone && <Text>{tenant.phone}</Text>}
            {!!tenant.email && <Text>{tenant.email}</Text>}
            {!!tenant.taxId && <Text>Tax ID: {tenant.taxId}</Text>}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Invoice details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{labels.issued}</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.issuedAt ?? undefined)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{labels.period}</Text>
              <Text style={styles.metaValue}>
                {fmtDate(invoice.periodStart)} – {fmtDate(invoice.periodEnd)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{labels.due}</Text>
              <Text style={styles.metaValue}>{fmtDate(invoice.dueDate ?? undefined)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{labels.currency}</Text>
              <Text style={styles.metaValue}>{cur}</Text>
            </View>
            {!!invoice.source && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{labels.source}</Text>
                <Text style={styles.metaValue}>{invoice.source}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line items */}
        <Text style={styles.sectionTitle}>{labels.itemsTitle}</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDesc]}>{labels.colDescription}</Text>
            <Text style={[styles.headerText, styles.colType]}>{labels.colType}</Text>
            <Text style={[styles.headerText, styles.colQty]}>{labels.colQty}</Text>
            <Text style={[styles.headerText, styles.colPrice]}>{labels.colUnitPrice}</Text>
            <Text style={[styles.headerText, styles.colTotal]}>{labels.colTotal}</Text>
          </View>
          {invoice.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colDesc}>
                {item.description}
                {item.couponCode ? ` (${item.couponCode})` : ''}
              </Text>
              <Text style={styles.colType}>{typeLabel(item.type, labels)}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{fmtMoney(item.unitPrice, cur)}</Text>
              <Text
                style={[
                  styles.colTotal,
                  item.type === 'discount' || item.total < 0 ? { color: '#dc2626' } : {},
                ]}
              >
                {fmtMoney(item.total, cur)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={{ marginTop: 14 }}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.totalSubtotal}</Text>
            <Text style={styles.summaryValue}>{fmtMoney(invoice.subtotal, cur)}</Text>
          </View>
          {invoice.discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{labels.totalDiscount}</Text>
              <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
                -{fmtMoney(invoice.discountTotal, cur)}
              </Text>
            </View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {labels.totalTax} ({invoice.taxRate}%)
              </Text>
              <Text style={styles.summaryValue}>{fmtMoney(invoice.taxAmount, cur)}</Text>
            </View>
          )}
          <View
            style={[
              styles.summaryRow,
              { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
            ]}
          >
            <Text style={[styles.summaryLabel, styles.summaryTotal]}>{labels.totalGrand}</Text>
            <Text style={[styles.summaryValue, styles.summaryTotal]}>
              {fmtMoney(invoice.total, cur)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.totalPaid}</Text>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
              {fmtMoney(invoice.amountPaid, cur)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontFamily: 'Helvetica-Bold' }]}>
              {labels.totalBalance}
            </Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  fontFamily: 'Helvetica-Bold',
                  color: invoice.balanceDue > 0 ? '#dc2626' : '#16a34a',
                },
              ]}
            >
              {fmtMoney(invoice.balanceDue, cur)}
            </Text>
          </View>
        </View>

        {/* Payment methods */}
        {(platform.payUrl || platform.bankInfo) && (
          <View style={styles.payBlock}>
            <Text style={styles.payTitle}>{labels.paymentMethods}</Text>
            {!!platform.bankInfo && (
              <Text>
                • {labels.bankTransfer} — {platform.bankInfo.bankName} {platform.bankInfo.iban}
                {`  ref: ${invoice.invoiceNumber}`}
              </Text>
            )}
            {!!platform.payUrl && (
              <Text>
                • {labels.payOnline}: {platform.payUrl}
              </Text>
            )}
          </View>
        )}

        {/* Notes */}
        {!!invoice.notes && (
          <View style={styles.notes}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>{labels.notes}</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${labels.footer} · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}

// ── Public helpers ──────────────────────────────────────────

export async function generateSaaSInvoicePdfBlob(props: SaaSInvoicePDFDocProps): Promise<Blob> {
  return pdf(<SaaSInvoicePDFDoc {...props} />).toBlob();
}

// ── Download Button ────────────────────────────────────────

export interface SaaSInvoiceDownloadButtonProps extends SaaSInvoicePDFDocProps {
  className?: string;
}

export function SaaSInvoiceDownloadButton({
  invoice,
  tenant,
  platform,
  labels = defaultSaaSInvoicePdfLabels(),
  className,
}: SaaSInvoiceDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <SaaSInvoicePDFDoc invoice={invoice} tenant={tenant} platform={platform} labels={labels} />
      }
      fileName={`${invoice.invoiceNumber}.pdf`}
      className={className}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          {loading ? labels.generating : labels.downloadPdf}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
