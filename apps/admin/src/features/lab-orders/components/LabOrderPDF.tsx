/**
 * Lab Order PDF — Phase 10.3
 *
 * Mirror of InvoicePDF: client-side PDF generation via @react-pdf/renderer
 * for printing or sending to dental labs.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Button } from '@dento/ui';
import { Download, Printer, MessageCircle } from 'lucide-react';
import type { LabOrder } from '../hooks/useLabOrders.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '@/stores/locale.store.js';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  pageRtl: { textAlign: 'right' },
  header: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  metaRow: { flexDirection: 'row', marginBottom: 4 },
  rowReverse: { flexDirection: 'row-reverse' },
  metaLabel: { width: 130, color: '#64748b' },
  metaValue: { fontFamily: 'Helvetica-Bold' },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 18,
    color: '#0f172a',
  },
  block: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 10,
    color: '#334155',
  },
  toothChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 9,
  },
  toothRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  signatureRow: { flexDirection: 'row', marginTop: 60, gap: 40 },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    paddingTop: 6,
    fontSize: 9,
    color: '#64748b',
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

function fmtDate(d?: string | null): string {
  return d ? formatDate(d) : '—';
}

export interface LabOrderPDFDocProps {
  order: LabOrder;
  patientName?: string;
  doctorName?: string;
  labName?: string;
  workTypeName?: string;
  clinicName?: string;
  clinicPhone?: string;
  isRTL?: boolean;
}

export function LabOrderPDFDoc({
  order,
  patientName,
  doctorName,
  labName,
  workTypeName,
  clinicName,
  clinicPhone,
  isRTL = false,
}: LabOrderPDFDocProps) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, isRTL ? styles.pageRtl : {}]}>
        <View style={styles.header}>
          <Text style={styles.title}>Lab Order</Text>
          <Text style={styles.subtitle}>
            #{order.orderNumber} · {fmtDate(order.orderDate)}
          </Text>
          {clinicName ? <Text style={styles.subtitle}>{clinicName}</Text> : null}
          {clinicPhone ? <Text style={styles.subtitle}>{clinicPhone}</Text> : null}
        </View>

        <View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Patient</Text>
            <Text style={styles.metaValue}>{patientName ?? order.patientId}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Doctor</Text>
            <Text style={styles.metaValue}>{doctorName ?? order.doctorId}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Lab</Text>
            <Text style={styles.metaValue}>{labName ?? order.dentalLabId}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Work Type</Text>
            <Text style={styles.metaValue}>{workTypeName ?? order.labOrderTypeId}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Expected Delivery</Text>
            <Text style={styles.metaValue}>{fmtDate(order.expectedDeliveryDate)}</Text>
          </View>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <Text style={styles.metaLabel}>Status</Text>
            <Text style={styles.metaValue}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Teeth</Text>
        <View style={[styles.toothRow, isRTL ? styles.rowReverse : {}]}>
          {order.toothNumbers.length === 0 ? (
            <Text style={{ fontSize: 9, color: '#64748b' }}>—</Text>
          ) : (
            order.toothNumbers.map((t) => (
              <Text key={t} style={styles.toothChip}>
                #{t}
              </Text>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Material & Shade</Text>
        <View style={styles.block}>
          <Text>Material: {order.material || '—'}</Text>
          <Text>Shade: {order.shade || '—'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <View style={styles.block}>
          <Text>{order.description || '—'}</Text>
        </View>

        {order.specialInstructions ? (
          <>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.block}>
              <Text>{order.specialInstructions}</Text>
            </View>
          </>
        ) : null}

        <View style={[styles.signatureRow, isRTL ? styles.rowReverse : {}]}>
          <View style={styles.signatureBox}>
            <Text>Doctor Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text>Lab Receipt</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Generated by Dento · Order {order.orderNumber} · {new Date().toLocaleString()}
        </Text>
      </Page>
    </Document>
  );
}

export interface LabOrderPDFProps extends LabOrderPDFDocProps {
  variant?: 'download' | 'print' | 'whatsapp';
}

export function LabOrderPDF({ variant = 'download', ...docProps }: LabOrderPDFProps) {
  const { isRTL } = useTranslation();
  const fileName = `lab-order-${docProps.order.orderNumber}.pdf`;

  if (variant === 'print') {
    const handlePrint = async () => {
      const blob = await pdf(<LabOrderPDFDoc {...docProps} isRTL={isRTL} />).toBlob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) {
        w.addEventListener('load', () => w.print());
      }
    };
    return (
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="me-2 h-4 w-4" />
        Print
      </Button>
    );
  }

  if (variant === 'whatsapp') {
    const handleSend = async () => {
      const blob = await pdf(<LabOrderPDFDoc {...docProps} isRTL={isRTL} />).toBlob();
      const url = URL.createObjectURL(blob);
      // Download for the user to attach manually (browsers cannot auto-attach files to wa.me)
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      const text = encodeURIComponent(`Lab Order #${docProps.order.orderNumber} (PDF attached)`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };
    return (
      <Button variant="outline" size="sm" onClick={handleSend}>
        <MessageCircle className="me-2 h-4 w-4" />
        WhatsApp
      </Button>
    );
  }

  return (
    <PDFDownloadLink document={<LabOrderPDFDoc {...docProps} isRTL={isRTL} />} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? 'Generating…' : 'Download PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
