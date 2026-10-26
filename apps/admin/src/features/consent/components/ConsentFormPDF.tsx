/**
 * ConsentFormPDF — Client-side consent PDF download.
 *
 * Uses @react-pdf/renderer to generate a printable PDF
 * that preserves patient signature and clinic branding.
 */

import {
  Document,
  Image,
  Page,
  PDFDownloadLink,
  StyleSheet,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer';
import { Button } from '@dento/ui';
import { Download } from 'lucide-react';
import type { ConsentForm } from '../hooks/useConsent.js';
import { useTranslation } from '@/stores/locale.store.js';

interface ConsentFormPDFProps {
  form: ConsentForm;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string | null;
  patientName: string;
  doctorName: string;
  templateName: string;
  procedureType: string;
  signedDate: string;
  consentText?: string;
  risksText?: string;
  isRTL?: boolean;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
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
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
  },
  metaItem: {
    fontSize: 10,
  },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 6,
    marginTop: 8,
  },
  box: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  signatureWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 10,
  },
  signatureImage: {
    width: 170,
    height: 72,
    objectFit: 'contain',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 4,
  },
  noSignature: {
    fontSize: 10,
    color: '#6b7280',
  },
  footer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export function ConsentFormPDFDoc({
  form,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  patientName,
  doctorName,
  templateName,
  procedureType,
  signedDate,
  consentText,
  risksText,
  isRTL = false,
}: ConsentFormPDFProps) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, isRTL ? styles.pageRtl : {}]}>
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

        <Text style={styles.title}>Consent Form</Text>
        <Text style={styles.subtitle}>
          {templateName} - {procedureType}
        </Text>

        <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Patient: </Text>
            {patientName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Doctor: </Text>
            {doctorName}
          </Text>
          <Text style={styles.metaItem}>
            <Text style={styles.metaLabel}>Signed: </Text>
            {signedDate}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Consent Content</Text>
        <View style={styles.box}>
          <Text>{consentText || '(No consent text available)'}</Text>
        </View>

        {!!risksText && (
          <>
            <Text style={styles.sectionTitle}>Risks & Considerations</Text>
            <View style={styles.box}>
              <Text>{risksText}</Text>
            </View>
          </>
        )}

        <View style={styles.signatureWrap}>
          <Text style={styles.sectionTitle}>Patient Signature</Text>
          {form.patientSignature ? (
            <Image src={form.patientSignature} style={styles.signatureImage} />
          ) : (
            <Text style={styles.noSignature}>No signature</Text>
          )}
        </View>

        <Text style={styles.footer}>
          {clinicName || 'Dento Clinic'}
          {clinicAddress || clinicPhone ? ' | ' : ''}
          {clinicAddress || ''}
          {clinicAddress && clinicPhone ? ' | ' : ''}
          {clinicPhone || ''}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateConsentPdfBlob(props: ConsentFormPDFProps): Promise<Blob> {
  return pdf(<ConsentFormPDFDoc {...props} />).toBlob();
}

export function ConsentFormPDF(props: ConsentFormPDFProps) {
  const { isRTL } = useTranslation();
  const fileName = `consent-${props.form._id}.pdf`;

  return (
    <PDFDownloadLink document={<ConsentFormPDFDoc {...props} isRTL={isRTL} />} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? 'Generating...' : 'Download PDF'}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
