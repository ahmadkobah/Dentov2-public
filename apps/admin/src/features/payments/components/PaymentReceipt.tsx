/**
 * Payment Receipt — per DENTO_V2_MASTER_PLAN.md §13 (Payments module).
 *
 * Uses @react-pdf/renderer for client-side receipt PDF generation.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import type { TenantPayment } from '../hooks/usePayments.js';
import { Button } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';
import { Download } from 'lucide-react';
import { formatCurrency as fmtCurrency, getDefaultCurrency } from '@/lib/currency.js';
import { formatDateTime } from '@/lib/date.js';

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontFamily: 'Helvetica-Bold',
  },
  amountBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#16a34a',
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
  return d ? formatDateTime(d) : '—';
}

function patientName(p: TenantPayment): string {
  if (typeof p.patientId === 'object' && p.patientId) {
    const pt = p.patientId;
    return `${pt.firstName?.en ?? ''} ${pt.lastName?.en ?? ''}`.trim() || pt.patientCode;
  }
  return String(p.patientId);
}

function invoiceRef(p: TenantPayment): string {
  if (typeof p.invoiceId === 'object' && p.invoiceId) return p.invoiceId.invoiceNumber;
  return String(p.invoiceId);
}

const METHOD_KEY_MAP: Record<string, string> = {
  cash: 'payments.method.cash',
  card: 'payments.method.card',
  bank_transfer: 'payments.method.bankTransfer',
  cheque: 'payments.method.cheque',
  insurance: 'payments.method.insurance',
  online: 'payments.method.online',
  fawry: 'payments.method.fawry',
  meeza: 'payments.method.meeza',
};

// ── PDF Document ───────────────────────────────────────────

interface ReceiptPDFDocProps {
  payment: TenantPayment;
  clinicName?: string;
  clinicPhone?: string;
}

function ReceiptPDFDoc({ payment, clinicName, clinicPhone }: ReceiptPDFDocProps) {
  const { t } = useTranslation();
  const cur = payment.currency ?? getDefaultCurrency();

  return (
    <Document>
      <Page size={[226.77, 500]} style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {clinicName && <Text style={styles.title}>{clinicName}</Text>}
          <Text style={[styles.title, { fontSize: 14 }]}>{t('payments.receipt.title')}</Text>
          {clinicPhone && <Text style={styles.subtitle}>{clinicPhone}</Text>}
        </View>

        <View style={styles.divider} />

        {/* Details */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('payments.receipt.patient')}</Text>
          <Text style={styles.value}>{patientName(payment)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('payments.receipt.invoice')}</Text>
          <Text style={styles.value}>{invoiceRef(payment)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('payments.receipt.method')}</Text>
          <Text style={styles.value}>
            {t(METHOD_KEY_MAP[payment.paymentMethod] ?? '') || payment.paymentMethod}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('payments.receipt.status')}</Text>
          <Text style={[styles.value, { textTransform: 'capitalize' }]}>{payment.status}</Text>
        </View>
        {payment.paymentReference && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('payments.receipt.reference')}</Text>
            <Text style={styles.value}>{payment.paymentReference}</Text>
          </View>
        )}
        {payment.last4 && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('payments.receipt.card')}</Text>
            <Text style={styles.value}>
              {payment.cardBrand ? `${payment.cardBrand} ` : ''}****{payment.last4}
            </Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.label}>{t('payments.receipt.date')}</Text>
          <Text style={styles.value}>{fmtDate(payment.receivedAt)}</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>{t('payments.receipt.amountPaid')}</Text>
          <Text style={styles.amountValue}>{fmtCurrency(payment.amount, cur)}</Text>
        </View>

        {/* Notes */}
        {payment.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { marginBottom: 2 }]}>{t('payments.receipt.notes')}</Text>
            <Text style={{ fontSize: 9 }}>{payment.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          {t('payments.receipt.thankYou')} • {fmtDate(payment.receivedAt)}
        </Text>
      </Page>
    </Document>
  );
}

// ── Download Button ────────────────────────────────────────

interface PaymentReceiptProps {
  payment: TenantPayment;
  clinicName?: string;
  clinicPhone?: string;
}

export default function PaymentReceipt({ payment, clinicName, clinicPhone }: PaymentReceiptProps) {
  const { t } = useTranslation();
  return (
    <PDFDownloadLink
      document={
        <ReceiptPDFDoc payment={payment} clinicName={clinicName} clinicPhone={clinicPhone} />
      }
      fileName={`receipt-${payment._id}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? t('payments.receipt.generating') : t('payments.receipt.btn')}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
