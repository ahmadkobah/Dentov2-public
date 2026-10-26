/**
 * Treatment Plan PDF — Day 12 Phase 4
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Renders branded treatment plan with phases, procedures, costs, and timeline.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Button } from '@dento/ui';
import { Download } from 'lucide-react';
import { formatCurrency as fmtCurrency, getDefaultCurrency } from '@/lib/currency.js';
import { formatDate } from '@/lib/date.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ──────────────────────────────────────────────────

export interface TreatmentPlanProcedure {
  _id?: string;
  procedureName: string;
  toothNumber?: string;
  surface?: string;
  sequenceOrder?: number;
  estimatedCost: number;
  insuranceCoverage?: number;
  patientCost?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface TreatmentPlanPhase {
  _id?: string;
  phaseName: string;
  phaseNumber: number;
  description?: string;
  procedures: TreatmentPlanProcedure[];
  estimatedDuration?: string;
}

export interface TreatmentPlanData {
  planNumber: string;
  planName: string;
  status: string;
  createdDate: string;
  patientName: string;
  patientAge?: number;
  patientPhone?: string;
  doctorName: string;
  diagnosis?: string;
  phases: TreatmentPlanPhase[];
  totalEstimatedCost: number;
  totalInsuranceCoverage: number;
  totalPatientCost: number;
  notes?: string;
  currency?: string;
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  infoBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 4,
  },
  infoTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#1e40af',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: 80,
    color: '#64748b',
    fontSize: 9,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#1e40af',
    borderRadius: 4,
  },
  phaseTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  phaseDuration: {
    fontSize: 9,
    color: '#bfdbfe',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#475569',
  },
  colProc: { flex: 3 },
  colTooth: { flex: 1, textAlign: 'center' },
  colSession: { flex: 1, textAlign: 'center' },
  colCost: { flex: 1.5, textAlign: 'right' },
  summaryBox: {
    marginTop: 20,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 3,
  },
  summaryLabel: {
    width: 140,
    textAlign: 'right',
    color: '#64748b',
    marginRight: 12,
  },
  summaryValue: {
    width: 90,
    textAlign: 'right',
  },
  summaryTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
  },
  notes: {
    marginTop: 16,
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

function statusBg(status: string): string {
  switch (status) {
    case 'completed':
      return '#dcfce7';
    case 'in_progress':
      return '#dbeafe';
    case 'cancelled':
      return '#fee2e2';
    default:
      return '#f1f5f9';
  }
}

function statusFg(status: string): string {
  switch (status) {
    case 'completed':
      return '#166534';
    case 'in_progress':
      return '#1d4ed8';
    case 'cancelled':
      return '#991b1b';
    default:
      return '#475569';
  }
}

// ── PDF Document ───────────────────────────────────────────

interface TreatmentPlanPDFDocProps {
  data: TreatmentPlanData;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

function TreatmentPlanPDFDoc({
  data,
  clinicName,
  clinicAddress,
  clinicPhone,
}: TreatmentPlanPDFDocProps) {
  const cur = data.currency ?? getDefaultCurrency();
  const { t } = useTranslation();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('treatmentPlans.pdf.title')}</Text>
            <Text style={styles.subtitle}>
              {data.planNumber} — {data.planName}
            </Text>
            {clinicName && <Text style={[styles.subtitle, { marginTop: 6 }]}>{clinicName}</Text>}
            {clinicAddress && <Text style={styles.subtitle}>{clinicAddress}</Text>}
            {clinicPhone && <Text style={styles.subtitle}>{clinicPhone}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor: statusBg(data.status),
                  color: statusFg(data.status),
                },
              ]}
            >
              {data.status.replace('_', ' ')}
            </Text>
            <Text style={[styles.subtitle, { marginTop: 8 }]}>
              {t('treatmentPlans.pdf.created')} {fmtDate(data.createdDate)}
            </Text>
          </View>
        </View>

        {/* Patient + Doctor Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('treatmentPlans.pdf.patient')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('treatmentPlans.pdf.name')}</Text>
              <Text style={styles.infoValue}>{data.patientName}</Text>
            </View>
            {data.patientAge && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('treatmentPlans.pdf.age')}</Text>
                <Text style={styles.infoValue}>
                  {data.patientAge} {t('treatmentPlans.pdf.years')}
                </Text>
              </View>
            )}
            {data.patientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('treatmentPlans.pdf.phone')}</Text>
                <Text style={styles.infoValue}>{data.patientPhone}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('treatmentPlans.pdf.doctor')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('treatmentPlans.pdf.name')}</Text>
              <Text style={styles.infoValue}>Dr. {data.doctorName}</Text>
            </View>
            {data.diagnosis && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('treatmentPlans.pdf.diagnosis')}</Text>
                <Text style={styles.infoValue}>{data.diagnosis}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Procedures Table (flat — all phases merged) */}
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colProc]}>
              {t('treatmentPlans.pdf.columns.procedure')}
            </Text>
            <Text style={[styles.headerText, styles.colTooth]}>
              {t('treatmentPlans.pdf.columns.tooth')}
            </Text>
            <Text style={[styles.headerText, styles.colSession]}>
              {t('treatmentPlans.pdf.columns.session')}
            </Text>
            <Text style={[styles.headerText, styles.colCost]}>
              {t('treatmentPlans.pdf.columns.estCost')}
            </Text>
          </View>
          {data.phases
            .flatMap((phase) => phase.procedures)
            .map((proc, pIdx) => (
              <View key={proc._id ?? pIdx} style={styles.tableRow}>
                <View style={styles.colProc}>
                  <Text>{proc.procedureName}</Text>
                  {proc.notes && (
                    <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>
                      {proc.notes}
                    </Text>
                  )}
                </View>
                <Text style={styles.colTooth}>{proc.toothNumber || '—'}</Text>
                <Text style={styles.colSession}>{proc.sequenceOrder ?? pIdx + 1}</Text>
                <Text style={styles.colCost}>{fmtCurrency(proc.estimatedCost, cur)}</Text>
              </View>
            ))}
        </View>

        {/* Financial Summary */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('treatmentPlans.pdf.totalEstimatedCost')}</Text>
            <Text style={styles.summaryValue}>{fmtCurrency(data.totalEstimatedCost, cur)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('treatmentPlans.pdf.insuranceCoverage')}</Text>
            <Text style={[styles.summaryValue, { color: '#2563eb' }]}>
              -{fmtCurrency(data.totalInsuranceCoverage, cur)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 },
            ]}
          >
            <Text style={[styles.summaryLabel, styles.summaryTotal]}>
              {t('treatmentPlans.pdf.patientResponsibility')}
            </Text>
            <Text style={[styles.summaryValue, styles.summaryTotal]}>
              {fmtCurrency(data.totalPatientCost, cur)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
              {t('treatmentPlans.pdf.notes')}
            </Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Consent */}
        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 9, color: '#475569', marginBottom: 20 }}>
            I have reviewed the treatment plan above and authorize the proposed procedures. I
            understand the estimated costs and that actual costs may vary.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <View
                style={{
                  width: 180,
                  borderTopWidth: 1,
                  borderTopColor: '#1a1a1a',
                  paddingTop: 4,
                }}
              >
                <Text style={{ textAlign: 'center', fontSize: 9 }}>Patient Signature</Text>
              </View>
            </View>
            <View>
              <View
                style={{
                  width: 180,
                  borderTopWidth: 1,
                  borderTopColor: '#1a1a1a',
                  paddingTop: 4,
                }}
              >
                <Text style={{ textAlign: 'center', fontSize: 9 }}>Date</Text>
              </View>
            </View>
          </View>
        </View>

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

export async function generateTreatmentPlanPdfBlob(props: TreatmentPlanPDFDocProps): Promise<Blob> {
  return pdf(<TreatmentPlanPDFDoc {...props} />).toBlob();
}

// ── Download Button ────────────────────────────────────────

interface TreatmentPlanPDFProps {
  data: TreatmentPlanData;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export default function TreatmentPlanPDF({
  data,
  clinicName,
  clinicAddress,
  clinicPhone,
}: TreatmentPlanPDFProps) {
  const { t } = useTranslation();
  return (
    <PDFDownloadLink
      document={
        <TreatmentPlanPDFDoc
          data={data}
          clinicName={clinicName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
        />
      }
      fileName={`${data.planNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? t('treatmentPlans.pdf.generating') : t('treatmentPlans.pdf.downloadPdf')}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
