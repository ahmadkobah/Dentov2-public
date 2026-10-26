/**
 * Report Filter Bar
 * Shared filter controls for report detail pages.
 * Date range, branch, doctor, period toggle.
 */

import { useState } from 'react';
import { Calendar, Building2, UserCog, RefreshCw } from 'lucide-react';
import { Button } from '@dento/ui';
import { Input } from '@dento/ui';
import { Label } from '@dento/ui';
import type { ReportQuery } from '../hooks/useReports.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface ReportFilterBarProps {
  filters: ReportQuery;
  onChange: (filters: ReportQuery) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  showBranch?: boolean;
  showDoctor?: boolean;
  showPeriod?: boolean;
}

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export default function ReportFilterBar({
  filters,
  onChange,
  onRefresh,
  isLoading,
  showBranch = true,
  showDoctor = true,
  showPeriod = true,
}: ReportFilterBarProps) {
  const { t } = useTranslation();
  const [localFrom, setLocalFrom] = useState(filters.from ?? '');
  const [localTo, setLocalTo] = useState(filters.to ?? '');

  const handleApply = () => {
    onChange({ ...filters, from: localFrom || undefined, to: localTo || undefined });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      {/* Date From */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" /> {t('reports.filter.from')}
        </Label>
        <Input
          type="date"
          className="h-9 w-40 text-sm"
          value={localFrom}
          onChange={(e) => setLocalFrom(e.target.value)}
        />
      </div>

      {/* Date To */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('reports.filter.to')}</Label>
        <Input
          type="date"
          className="h-9 w-40 text-sm"
          value={localTo}
          onChange={(e) => setLocalTo(e.target.value)}
        />
      </div>

      {/* Period Toggle */}
      {showPeriod && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t('reports.filter.period')}</Label>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.period === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
                onClick={() => onChange({ ...filters, period: opt.value })}
              >
                {t(`reports.filter.${opt.value}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branch */}
      {showBranch && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {t('reports.filter.branch')}
          </Label>
          <Input
            className="h-9 w-36 text-sm"
            placeholder={t('reports.filter.allBranches')}
            value={filters.branchId ?? ''}
            onChange={(e) => onChange({ ...filters, branchId: e.target.value || undefined })}
          />
        </div>
      )}

      {/* Doctor */}
      {showDoctor && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <UserCog className="h-3 w-3" /> {t('reports.filter.doctor')}
          </Label>
          <Input
            className="h-9 w-36 text-sm"
            placeholder={t('reports.filter.allDoctors')}
            value={filters.doctorId ?? ''}
            onChange={(e) => onChange({ ...filters, doctorId: e.target.value || undefined })}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 ms-auto">
        <Button size="sm" onClick={handleApply}>
          {t('reports.filter.apply')}
        </Button>
        {onRefresh && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh report"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  );
}
