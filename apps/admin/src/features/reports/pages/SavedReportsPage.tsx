/**
 * Saved Reports Page — `/reports/saved`
 *
 * Lists saved report configurations. Click to load in ReportDetailPage.
 * Uses useSavedReports hooks (future backend endpoint).
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Clock, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardTitle, CardDescription } from '@dento/ui';
import { Badge } from '@dento/ui';
import { Button, toast } from '@dento/ui';
import { useSavedReports, useDeleteSavedReport } from '../hooks/useReports.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

export default function SavedReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: savedReports = [], isLoading, isError, error, refetch } = useSavedReports();
  const deleteMutation = useDeleteSavedReport();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(t('reports.saved.toast.removed'));
    } catch {
      toast.error(t('reports.saved.toast.removeFailed'));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <TableSkeleton columns={3} rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <ErrorState
          title="Failed to load saved reports"
          message={error?.message}
          onRetry={refetch}
        />
      </div>
    );
  }

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
            <Bookmark className="h-6 w-6 text-primary" />
            {t('reports.saved.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('reports.saved.subtitle')}</p>
        </div>
      </div>

      {/* Empty State */}
      {savedReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Bookmark className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground">
              {t('reports.saved.empty.title')}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t('reports.saved.empty.description')}
            </p>
            <Button variant="outline" onClick={() => navigate('/reports')}>
              {t('reports.saved.browseReports')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedReports.map((report) => (
            <Card
              key={report._id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/reports/${report.category}/${report.reportType}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Bookmark className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">{report.name}</CardTitle>
                  <CardDescription className="text-xs flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      {report.category}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Saved {formatDate(report.savedAt)}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete saved report"
                    onClick={(e) => handleDelete(report._id, e)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
