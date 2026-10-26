/**
 * Export Report Dialog
 * Modal for choosing export format (CSV, Excel, PDF) and triggering export.
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, File, X, Loader2 } from 'lucide-react';
import { Button } from '@dento/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@dento/ui';
import { Badge } from '@dento/ui';
import { toast } from '@dento/ui';
import { useExportReport } from '../hooks/useReports.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface ExportReportDialogProps {
  open: boolean;
  onClose: () => void;
  category: string;
  reportType: string;
  filters?: Record<string, unknown>;
}

const FORMATS = [
  {
    value: 'csv' as const,
    label: 'CSV',
    description: 'Comma-separated values — opens in any spreadsheet',
    icon: FileText,
  },
  {
    value: 'excel' as const,
    label: 'Excel',
    description: 'Microsoft Excel workbook (.xlsx)',
    icon: FileSpreadsheet,
  },
  {
    value: 'pdf' as const,
    label: 'PDF',
    description: 'Print-ready document with charts',
    icon: File,
  },
];

export default function ExportReportDialog({
  open,
  onClose,
  category,
  reportType,
  filters = {},
}: ExportReportDialogProps) {
  const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const exportMutation = useExportReport();

  if (!open) return null;

  const handleExport = () => {
    exportMutation.mutate(
      {
        category,
        reportType,
        format: selectedFormat,
        filters,
      },
      {
        onSuccess: () => {
          toast.success(t('reports.export.toast.success'));
          onClose();
        },
        onError: () => {
          toast.error(t('reports.export.toast.failed'));
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <Card className="relative z-10 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-primary" />
              {t('reports.export.title')}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close export dialog">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('reports.export.chooseFormat')}{' '}
            <Badge variant="secondary" className="text-[10px] px-2 py-0">
              {category}/{reportType}
            </Badge>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = selectedFormat === fmt.value;
              return (
                <button
                  key={fmt.value}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-start transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                  onClick={() => setSelectedFormat(fmt.value)}
                >
                  <div
                    className={`rounded-lg p-2 ${
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t(`reports.export.${fmt.value}`)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`reports.export.${fmt.value}Desc`)}
                    </p>
                  </div>
                  {isSelected && <div className="h-4 w-4 rounded-full border-4 border-primary" />}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              {t('reports.export.cancel')}
            </Button>
            <Button onClick={handleExport} disabled={exportMutation.isPending} className="gap-2">
              {exportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {t('reports.export.submit', { format: selectedFormat.toUpperCase() })}
            </Button>
          </div>

          {exportMutation.isError && (
            <p className="text-xs text-destructive text-center">
              {t('reports.export.toast.failed')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
