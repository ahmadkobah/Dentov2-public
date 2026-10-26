/**
 * LiveReportCard + Chart Renderers
 * Extracted from ReportCategoryPage.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useReport, type ReportData } from '../hooks/useReports.js';
import {
  type ReportItem,
  FREE_REPORT_CHART_DATA,
  BAR_COLORS,
} from '../config/report-catalog.config.js';
import { Eye, Download, Loader2, AlertCircle } from 'lucide-react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@dento/ui';
import { Badge } from '@dento/ui';
import { Button } from '@dento/ui';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Live Report Card (API-backed with mock fallback) ────────────────────────

export function LiveReportCard({ report, category }: { report: ReportItem; category: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Use the universal category dispatch hook
  const query = useReport(category, report.type, {});

  const liveData = query.data;
  const isLive = !!liveData && !liveData.locked && (liveData.chart || liveData.summary);
  const isLoading = query.isLoading;
  const isError = query.isError;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{report.name.en}</CardTitle>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 text-green-600 border-green-300"
              >
                LIVE
              </Badge>
            )}
            {report.isFree && (
              <Badge variant="success" className="text-[10px] px-2 py-0">
                FREE
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">{report.description.en}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading live data…
          </div>
        )}
        {/* Error indicator */}
        {isError && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-destructive mb-2">
            <AlertCircle className="h-3 w-3" />
            {t('reports.liveCard.loadFailed')}
          </div>
        )}
        {/* Chart: use live data chart array if available, otherwise fall back to mock */}
        <div className="h-48 mt-2">
          {isLive && Array.isArray(liveData.chart) && liveData.chart.length > 0
            ? renderLiveChart(report.type, liveData)
            : renderFreeChart(report.type)}
        </div>
        {/* Summary KPIs from live data */}
        {isLive && liveData.summary && (
          <div className="flex flex-wrap gap-3 mt-2 text-xs">
            {Object.entries(liveData.summary).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1">
                <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="font-semibold">
                  {typeof val === 'number'
                    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(val)
                    : String(val)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            onClick={() => navigate(`/reports/${category}/${report.type}`)}
          >
            <Eye className="h-3 w-3" />
            {t('reports.liveCard.viewFull')}
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-xs">
            <Download className="h-3 w-3" />
            {t('reports.liveCard.export')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Chart Renderers ─────────────────────────────────────────────────────────

function renderFreeChart(reportType: string): React.ReactNode {
  const data = FREE_REPORT_CHART_DATA[reportType];
  if (!data) return null;

  if (reportType === 'patient_overview') {
    const pieData = data as Array<{ name: string; value: number; color: string }>;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={70}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (reportType === 'revenue_summary') {
    const barData = data as Array<{ period: string; revenue: number }>;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {barData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    );
  }

  if (reportType === 'appointment_summary') {
    const barData = data as Array<{ status: string; count: number }>;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ReBarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="status" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {barData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ── Live Data Chart Renderer ────────────────────────────────────────────────

function renderLiveChart(reportType: string, data: ReportData): React.ReactNode {
  const chart = data.chart as Record<string, unknown>[] | undefined;
  if (!chart || chart.length === 0) return null;

  // Determine data key by looking at first record's keys
  const keys = Object.keys(chart[0]).filter((k) => typeof chart[0][k] === 'number');
  const labelKey = Object.keys(chart[0]).find((k) => typeof chart[0][k] === 'string') ?? 'label';

  if (reportType === 'patient_overview' && chart.every((d) => 'value' in d && 'name' in d)) {
    // Pie chart for patient overview
    const pieData = chart as Array<{ name: string; value: number; color?: string }>;
    const defaultColors = ['#3b82f6', '#94a3b8', '#22c55e', '#f59e0b', '#ef4444'];
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            outerRadius={70}
            dataKey="value"
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {pieData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color ?? defaultColors[index % defaultColors.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart with first numeric key
  const dataKey = keys[0] ?? 'value';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReBarChart data={chart}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {chart.map((_, index) => (
            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}
