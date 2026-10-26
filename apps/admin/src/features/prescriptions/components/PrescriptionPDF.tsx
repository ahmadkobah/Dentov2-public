/**
 * Prescription PDF — Day 12 Phase 4
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Renders branded prescription with patient info, medications, and doctor signature.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { Button } from '@dento/ui';
import { Download } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Types ──────────────────────────────────────────────────

export interface PrescriptionMedication {
  _id?: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity?: number;
  refills?: number;
}

export interface PrescriptionData {
  prescriptionNumber: string;
  issueDate: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorLicenseNumber?: string;
  diagnosis?: string;
  medications: PrescriptionMedication[];
  notes?: string;
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
    borderBottomColor: '#0f766e',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f766e',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  rxSymbol: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#0f766e',
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  infoBox: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0fdfa',
    borderRadius: 4,
  },
  infoTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#0f766e',
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
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f766e',
    marginBottom: 8,
    marginTop: 16,
  },
  medCard: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  medNum: {
    position: 'absolute',
    top: 8,
    left: -16,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    color: '#fff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    lineHeight: 20,
  },
  medName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 2,
  },
  medGeneric: {
    fontSize: 9,
    color: '#64748b',
    marginBottom: 6,
  },
  medDetailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 3,
  },
  medDetail: {
    flexDirection: 'row',
    gap: 4,
  },
  medDetailLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  medDetailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  medInstructions: {
    marginTop: 6,
    padding: 6,
    backgroundColor: '#fff7ed',
    borderRadius: 3,
    fontSize: 9,
    color: '#92400e',
  },
  notes: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    fontSize: 9,
    color: '#475569',
  },
  signatureArea: {
    marginTop: 40,
    alignItems: 'flex-end',
  },
  signatureLine: {
    width: 180,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 4,
    textAlign: 'center',
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

// ── PDF Document ───────────────────────────────────────────

interface PrescriptionPDFDocProps {
  data: PrescriptionData;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

function PrescriptionPDFDoc({
  data,
  clinicName,
  clinicAddress,
  clinicPhone,
}: PrescriptionPDFDocProps) {
  const { t } = useTranslation();
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('prescriptions.pdf.prescription')}</Text>
            <Text style={styles.subtitle}>{data.prescriptionNumber}</Text>
            {clinicName && <Text style={[styles.subtitle, { marginTop: 6 }]}>{clinicName}</Text>}
            {clinicAddress && <Text style={styles.subtitle}>{clinicAddress}</Text>}
            {clinicPhone && <Text style={styles.subtitle}>{clinicPhone}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.rxSymbol}>℞</Text>
            <Text style={styles.subtitle}>
              {t('prescriptions.pdf.date')} {fmtDate(data.issueDate)}
            </Text>
          </View>
        </View>

        {/* Patient & Doctor Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('prescriptions.pdf.patientInfo')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('prescriptions.pdf.name')}</Text>
              <Text style={styles.infoValue}>{data.patientName}</Text>
            </View>
            {data.patientAge && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('prescriptions.pdf.age')}</Text>
                <Text style={styles.infoValue}>
                  {data.patientAge} {t('prescriptions.pdf.years')}
                </Text>
              </View>
            )}
            {data.patientGender && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('prescriptions.pdf.gender')}</Text>
                <Text style={styles.infoValue}>{data.patientGender}</Text>
              </View>
            )}
            {data.patientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('prescriptions.pdf.phone')}</Text>
                <Text style={styles.infoValue}>{data.patientPhone}</Text>
              </View>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>{t('prescriptions.pdf.prescribingDoctor')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('prescriptions.pdf.doctorLabel')}</Text>
              <Text style={styles.infoValue}>Dr. {data.doctorName}</Text>
            </View>
            {data.doctorSpecialty && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('prescriptions.pdf.specialty')}</Text>
                <Text style={styles.infoValue}>{data.doctorSpecialty}</Text>
              </View>
            )}
            {data.doctorLicenseNumber && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('prescriptions.pdf.license')}</Text>
                <Text style={styles.infoValue}>{data.doctorLicenseNumber}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Diagnosis */}
        {data.diagnosis && (
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{t('prescriptions.pdf.diagnosis')}</Text>
            <Text>{data.diagnosis}</Text>
          </View>
        )}

        {/* Medications */}
        <Text style={styles.sectionTitle}>
          {t('prescriptions.pdf.medications')} ({data.medications.length})
        </Text>
        <View style={{ paddingLeft: 20 }}>
          {data.medications.map((med, idx) => (
            <View key={med._id ?? idx} style={styles.medCard}>
              <Text style={styles.medNum}>{idx + 1}</Text>
              <Text style={styles.medName}>{med.medicationName}</Text>
              {med.genericName && <Text style={styles.medGeneric}>({med.genericName})</Text>}
              <View style={styles.medDetailRow}>
                <View style={styles.medDetail}>
                  <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.dosage')}:</Text>
                  <Text style={styles.medDetailValue}>{med.dosage}</Text>
                </View>
                <View style={styles.medDetail}>
                  <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.frequency')}:</Text>
                  <Text style={styles.medDetailValue}>{med.frequency}</Text>
                </View>
                <View style={styles.medDetail}>
                  <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.duration')}:</Text>
                  <Text style={styles.medDetailValue}>{med.duration}</Text>
                </View>
                {med.route && (
                  <View style={styles.medDetail}>
                    <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.route')}:</Text>
                    <Text style={styles.medDetailValue}>{med.route}</Text>
                  </View>
                )}
              </View>
              {(med.quantity || med.refills) && (
                <View style={[styles.medDetailRow, { marginTop: 3 }]}>
                  {med.quantity && (
                    <View style={styles.medDetail}>
                      <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.qty')}:</Text>
                      <Text style={styles.medDetailValue}>{med.quantity}</Text>
                    </View>
                  )}
                  {med.refills !== undefined && med.refills > 0 && (
                    <View style={styles.medDetail}>
                      <Text style={styles.medDetailLabel}>{t('prescriptions.pdf.refills')}:</Text>
                      <Text style={styles.medDetailValue}>{med.refills}</Text>
                    </View>
                  )}
                </View>
              )}
              {med.instructions && <Text style={styles.medInstructions}>⚠ {med.instructions}</Text>}
            </View>
          ))}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
              {t('prescriptions.pdf.notes')}
            </Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureLine}>
            <Text>Dr. {data.doctorName}</Text>
            {data.doctorLicenseNumber && (
              <Text style={{ fontSize: 8, color: '#64748b' }}>
                License: {data.doctorLicenseNumber}
              </Text>
            )}
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

export async function generatePrescriptionPdfBlob(props: PrescriptionPDFDocProps): Promise<Blob> {
  return pdf(<PrescriptionPDFDoc {...props} />).toBlob();
}

// ── Download Button ────────────────────────────────────────

interface PrescriptionPDFProps {
  data: PrescriptionData;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export default function PrescriptionPDF({
  data,
  clinicName,
  clinicAddress,
  clinicPhone,
}: PrescriptionPDFProps) {
  const { t } = useTranslation();
  return (
    <PDFDownloadLink
      document={
        <PrescriptionPDFDoc
          data={data}
          clinicName={clinicName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
        />
      }
      fileName={`${data.prescriptionNumber}.pdf`}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? t('prescriptions.pdf.generating') : t('prescriptions.pdf.btn')}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
