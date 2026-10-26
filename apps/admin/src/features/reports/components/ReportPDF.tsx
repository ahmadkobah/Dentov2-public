/**
 * Report PDF — Day 12 Phase 4
 *
 * Uses @react-pdf/renderer for client-side PDF generation.
 * Generic analytics report PDF — renders title, summary KPIs, and data table.
 */

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@dento/ui';
import { Download } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

// ── Types ──────────────────────────────────────────────────

export interface ReportPDFSummaryItem {
  label: string;
  value: string | number;
  change?: number;
}

export interface ReportPDFData {
  title: string;
  category: string;
  reportType: string;
  period: { from: string; to: string };
  generatedAt: string;
  summary: ReportPDFSummaryItem[];
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
}

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
  header: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#4472C4',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  metaItem: {
    flexDirection: 'row',
    gap: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    minWidth: 120,
    padding: 12,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#4472C4',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginTop: 4,
  },
  summaryChange: {
    fontSize: 8,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4472C4',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  cellText: {
    fontSize: 9,
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
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
  },
});

// ── Helpers ────────────────────────────────────────────────

function fmtDate(d?: string): string {
  return d ? formatDate(d) : '—';
}

function isNumeric(val: unknown): boolean {
  return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)));
}

// ── PDF Document ───────────────────────────────────────────

interface ReportPDFDocProps {
  data: ReportPDFData;
  clinicName?: string;
  isRTL?: boolean;
}

function ReportPDFDoc({ data, clinicName, isRTL = false }: ReportPDFDocProps) {
  const colWidth = Math.max(1, 100 / data.columns.length);

  return (
    <Document>
      <Page size="A4" style={[styles.page, isRTL ? styles.pageRtl : {}]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>
            {data.category.charAt(0).toUpperCase() + data.category.slice(1)} Report —{' '}
            {data.reportType}
          </Text>
          <View style={[styles.metaRow, isRTL ? styles.rowReverse : {}]}>
            <View style={[styles.metaItem, isRTL ? styles.rowReverse : {}]}>
              <Text style={styles.metaLabel}>Period:</Text>
              <Text style={styles.metaValue}>
                {fmtDate(data.period.from)} — {fmtDate(data.period.to)}
              </Text>
            </View>
            <View style={[styles.metaItem, isRTL ? styles.rowReverse : {}]}>
              <Text style={styles.metaLabel}>Generated:</Text>
              <Text style={styles.metaValue}>{fmtDate(data.generatedAt)}</Text>
            </View>
            {clinicName && (
              <View style={[styles.metaItem, isRTL ? styles.rowReverse : {}]}>
                <Text style={styles.metaLabel}>Clinic:</Text>
                <Text style={styles.metaValue}>{clinicName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Summary KPIs */}
        {data.summary.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={[styles.summaryGrid, isRTL ? styles.rowReverse : {}]}>
              {data.summary.map((item, idx) => (
                <View key={idx} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  {item.change !== undefined && (
                    <Text
                      style={[
                        styles.summaryChange,
                        { color: item.change >= 0 ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      {item.change >= 0 ? '▲' : '▼'} {Math.abs(item.change)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Data Table */}
        <Text style={styles.sectionTitle}>
          Detail ({data.rows.length} row{data.rows.length !== 1 ? 's' : ''})
        </Text>
        <View>
          <View style={[styles.tableHeader, isRTL ? styles.rowReverse : {}]}>
            {data.columns.map((col) => (
              <View key={col} style={{ width: `${colWidth}%` }}>
                <Text style={styles.headerText}>
                  {col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
          {data.rows.map((row, rIdx) => (
            <View
              key={rIdx}
              style={[
                styles.tableRow,
                isRTL ? styles.rowReverse : {},
                rIdx % 2 === 1 ? styles.tableRowAlt : {},
              ]}
            >
              {data.columns.map((col) => {
                const val = row[col];
                const textStr = val == null ? '—' : String(val);
                return (
                  <View key={col} style={{ width: `${colWidth}%` }}>
                    <Text style={[styles.cellText, isNumeric(val) ? { textAlign: 'right' } : {}]}>
                      {textStr}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {formatDate(new Date().toISOString())} • Dento V2 Analytics • {data.title}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

// ── Download Button ────────────────────────────────────────

interface ReportPDFProps {
  data: ReportPDFData;
  clinicName?: string;
}

export default function ReportPDF({ data, clinicName }: ReportPDFProps) {
  const { t, isRTL } = useTranslation();
  const fileName = `${data.reportType}_${data.period.from}_to_${data.period.to}.pdf`;
  return (
    <PDFDownloadLink
      document={<ReportPDFDoc data={data} clinicName={clinicName} isRTL={isRTL} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button variant="outline" size="sm" disabled={loading}>
          <Download className="me-2 h-4 w-4" />
          {loading ? t('reports.generatingReport') : t('reports.pdf.download')}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
