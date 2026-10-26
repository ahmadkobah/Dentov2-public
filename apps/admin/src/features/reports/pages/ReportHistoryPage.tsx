/**
 * Report History Page — `/reports/history`
 *
 * Lists report generation history with status badges and download links.
 * Uses useReportHistory() hook.
 */

import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  History,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@dento/ui';
import { Badge } from '@dento/ui';
import { Button } from '@dento/ui';
import { useReportHistory } from '../hooks/useReports.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDateTime } from '@/lib/date.js';

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    label: 'Pending',
  },
  processing: {
    icon: Loader2,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    label: 'Processing',
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-500/10',
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-500/10',
    label: 'Failed',
  },
};

export default function ReportHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useReportHistory();

  const history = data?.history ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/reports')}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            {t('reports.history.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('reports.history.subtitle')}</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">{t('reports.history.loadFailed')}</p>
              <p className="text-sm text-muted-foreground">{t('reports.history.refreshPrompt')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && history.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <History className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">
              {t('reports.history.empty.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t('reports.history.empty.description')}
            </p>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              {t('reports.history.browseReports')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      {history.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.report')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.category')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.format')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.status')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.generated')}
                </th>
                <th className="px-4 py-3 text-start text-xs font-medium text-gray-500">
                  {t('reports.history.col.triggeredBy')}
                </th>
                <th className="px-4 py-3 text-end text-xs font-medium text-gray-500">
                  {t('reports.history.col.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status];
                const StatusIcon = statusCfg.icon;
                return (
                  <tr
                    key={item._id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-gray-900 dark:text-white capitalize">
                          {item.reportType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 capitalize">
                        {item.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] px-2 py-0 uppercase">
                        {item.format}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                      >
                        <StatusIcon
                          className={`h-3 w-3 ${item.status === 'processing' ? 'animate-spin' : ''}`}
                        />
                        {statusCfg.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDateTime(item.generatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={item.triggeredBy === 'schedule' ? 'secondary' : 'outline'}
                        className="text-[10px] px-2 py-0 capitalize"
                      >
                        {item.triggeredBy}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      {item.status === 'completed' && item.fileUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => window.open(item.fileUrl!, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                          {t('reports.history.download')}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
