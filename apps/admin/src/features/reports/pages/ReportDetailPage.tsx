/**
 * Report Detail Page — `/reports/:category/:type`
 *
 * Full drill-down view for a single report with:
 * - Filter bar (date range, branch, doctor, period)
 * - Chart section (auto-detected chart type)
 * - Sortable data table
 * - Export button (triggers ExportReportDialog)
 * - PDF download via ReportPDF
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, AlertCircle, Lock, Crown } from 'lucide-react';
import { Button } from '@dento/ui';
import { Badge } from '@dento/ui';
import { Card, CardContent } from '@dento/ui';
import { useReport, type ReportQuery } from '../hooks/useReports.js';
import ReportFilterBar from '../components/ReportFilterBar.js';
import ReportChart from '../components/ReportChart.js';
import ReportDataTable from '../components/ReportDataTable.js';
import ExportReportDialog from '../components/ExportReportDialog.js';
import ReportPDFDownload from '../components/ReportPDF.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDateTime } from '@/lib/date.js';

// ── Report name map (matches ReportCategoryPage CATEGORY_CONFIG) ────────────

const REPORT_NAMES: Record<string, Record<string, { en: string; ar: string }>> = {
  financial: {
    revenue_summary: { en: 'Revenue Summary', ar: 'ملخص الإيرادات' },
    revenue_by_doctor: { en: 'Revenue by Doctor', ar: 'الإيرادات حسب الطبيب' },
    revenue_by_service: { en: 'Revenue by Service', ar: 'الإيرادات حسب الخدمة' },
    revenue_by_branch: { en: 'Revenue by Branch', ar: 'الإيرادات حسب الفرع' },
    payment_collection: { en: 'Payment Collection', ar: 'تحصيل المدفوعات' },
    outstanding_aging: { en: 'Outstanding & Aging', ar: 'المستحقات والتقادم' },
    tax_report: { en: 'Tax Report', ar: 'تقرير الضرائب' },
    payer_mix: { en: 'Payer Mix', ar: 'توزيع الدافعين' },
    commission_report: { en: 'Commission Report', ar: 'تقرير العمولات' },
    refund_report: { en: 'Refund Report', ar: 'تقرير الاستردادات' },
  },
  patient: {
    patient_overview: { en: 'Patient Overview', ar: 'نظرة عامة على المرضى' },
    new_vs_returning: { en: 'New vs Returning', ar: 'جديد مقابل عائد' },
    demographics: { en: 'Demographics', ar: 'التركيبة السكانية' },
    no_show: { en: 'No-Show Analysis', ar: 'تحليل عدم الحضور' },
    source_referral: { en: 'Source & Referral', ar: 'المصدر والإحالة' },
  },
  appointment: {
    summary: { en: 'Appointment Summary', ar: 'ملخص المواعيد' },
    doctor_utilization: { en: 'Doctor Utilization', ar: 'استخدام الأطباء' },
    chair_utilization: { en: 'Chair Utilization', ar: 'استخدام الكراسي' },
    cancellation_analysis: { en: 'Cancellation Analysis', ar: 'تحليل الإلغاءات' },
    peak_hours: { en: 'Peak Hours Heatmap', ar: 'ساعات الذروة' },
    avg_duration: { en: 'Avg Duration Analysis', ar: 'تحليل متوسط المدة' },
  },
  clinical: {
    procedures_performed: { en: 'Procedures Performed', ar: 'الإجراءات المنفذة' },
    treatment_plan_acceptance: { en: 'Treatment Plan Acceptance', ar: 'قبول خطط العلاج' },
    lab_order_turnaround: { en: 'Lab Order Turnaround', ar: 'دورة طلبات المختبر' },
    prescription_volume: { en: 'Prescription Volume', ar: 'حجم الوصفات' },
  },
  operational: {
    wait_time_analysis: { en: 'Wait Time Analysis', ar: 'تحليل وقت الانتظار' },
    staff_productivity: { en: 'Staff Productivity', ar: 'إنتاجية الموظفين' },
    commission_summary: { en: 'Commission Summary', ar: 'ملخص العمولات' },
    daily_reconciliation: { en: 'Daily Reconciliation', ar: 'التسوية اليومية' },
  },
  inventory: {
    material_usage: { en: 'Material Usage', ar: 'استهلاك المواد' },
    low_stock: { en: 'Low Stock Alerts', ar: 'تنبيهات المخزون المنخفض' },
    stock_movement_history: { en: 'Stock Movement', ar: 'حركة المخزون' },
    expiry_report: { en: 'Expiry Tracking', ar: 'تتبع الصلاحية' },
    consumption_forecast: { en: 'Consumption Analysis', ar: 'تحليل الاستهلاك' },
    stock_valuation: { en: 'Stock Valuation', ar: 'تقييم المخزون' },
  },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function ReportDetailPage() {
  const { t } = useTranslation();
  const { category, type } = useParams<{ category: string; type: string }>();
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<ReportQuery>({
    period: 'monthly',
  });
  const [showExport, setShowExport] = useState(false);

  // Fetch report data
  const {
    data: reportData,
    isLoading,
    isError,
    refetch,
  } = useReport(category ?? '', type ?? '', filters);

  const reportName = REPORT_NAMES[category ?? '']?.[type ?? ''] ?? { en: type ?? 'Report', ar: '' };

  // Locked / paid report
  if (reportData?.locked) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/reports/${category}`)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">{reportName.en}</h1>
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Lock className="h-3 w-3" /> {t('reports.badge.locked')}
          </Badge>
        </div>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Lock className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('reports.locked.title')}</h2>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {reportData.upgradeMessage?.en ??
                'Upgrade to access detailed analytics, custom date ranges, export capabilities, and trend analysis.'}
            </p>
            <Button className="gap-2 mt-2">
              <Crown className="h-4 w-4" />
              {t('reports.upgrade.button')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/reports/${category}`)}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{reportName.en}</h1>
            <p className="text-xs text-muted-foreground capitalize">
              {category} Reports
              {reportData?.generatedAt && ` • Generated ${formatDateTime(reportData.generatedAt)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowExport(true)}>
            <Download className="h-4 w-4" />
            {t('reports.detail.export')}
          </Button>
          {reportData?.summary && reportData?.table && (
            <ReportPDFDownload
              data={{
                title: reportName.en,
                category: category ?? '',
                reportType: type ?? '',
                period: {
                  from: filters.from ?? '',
                  to: filters.to ?? '',
                },
                generatedAt: reportData.generatedAt ?? new Date().toISOString(),
                summary: Object.entries(reportData.summary).map(([label, value]) => ({
                  label: label.replace(/_/g, ' '),
                  value: value as string | number,
                })),
                columns: reportData.table.length
                  ? Object.keys(reportData.table[0] as Record<string, unknown>)
                  : [],
                rows: (reportData.table ?? []) as Record<
                  string,
                  string | number | boolean | null
                >[],
              }}
            />
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        onRefresh={() => refetch()}
        isLoading={isLoading}
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ms-3 text-sm text-muted-foreground">
            {t('reports.generatingReport')}
          </span>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card className="border-destructive/20">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {t('reports.error.loadReport')}
              </p>
              <p className="text-xs text-muted-foreground">{t('reports.error.retryMessage')}</p>
            </div>
            <Button size="sm" variant="outline" className="ms-auto" onClick={() => refetch()}>
              {t('reports.error.retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary KPIs */}
      {reportData?.summary && !isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(reportData.summary).map(([key, val]) => (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            >
              <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                {typeof val === 'number'
                  ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(val)
                  : String(val)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart Section */}
      {!isLoading && (
        <ReportChart
          data={reportData?.chart as Record<string, unknown>[] | undefined}
          title="Chart"
        />
      )}

      {/* Data Table Section */}
      {!isLoading && (
        <ReportDataTable
          data={reportData?.table as Record<string, unknown>[] | undefined}
          title="Data"
        />
      )}

      {/* Export Dialog */}
      <ExportReportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        category={category ?? ''}
        reportType={type ?? ''}
        filters={filters as Record<string, unknown>}
      />
    </div>
  );
}
