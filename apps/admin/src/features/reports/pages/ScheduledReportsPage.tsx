/**
 * Scheduled Reports Page — Day 11
 *
 * Manages report schedules and displays generation history.
 * Two-tab layout: Schedules (CRUD) + History (read-only).
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  FileText,
  History,
  Mail,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  Download,
  RefreshCw,
  CalendarClock,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  EmptyState,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
  type ColumnDef,
} from '@dento/ui';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { formatDateTime } from '@/lib/date.js';
import { useTranslation } from '../../../stores/locale.store.js';
import {
  useScheduleList,
  useDeleteSchedule,
  useUpdateSchedule,
  useRunScheduleNow,
  useReportHistory,
  type ReportSchedule,
  type ReportHistory,
} from '../hooks/useReports.js';

// ── Constants ───────────────────────────────────────────

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const FORMAT_BADGES: Record<string, 'default' | 'secondary' | 'outline'> = {
  csv: 'outline',
  excel: 'default',
  pdf: 'secondary',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'secondary',
  completed: 'default',
  failed: 'destructive',
};

const DELIVERY_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  download: Download,
  both: Mail,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Component ───────────────────────────────────────────

export default function ScheduledReportsPage() {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules');
  const [deleteTarget, setDeleteTarget] = useState<ReportSchedule | null>(null);

  const schedulesQuery = useScheduleList();
  const historyQuery = useReportHistory();
  const deleteSchedule = useDeleteSchedule();
  const updateSchedule = useUpdateSchedule();
  const runNow = useRunScheduleNow();

  // ── Formatters ──────────────────────────────────────

  const fmtDate = useCallback((d: string | null) => (d ? formatDateTime(d) : '—'), []);

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const buildFrequencyLabel = (s: ReportSchedule) => {
    let label = FREQUENCY_LABELS[s.frequency] || s.frequency;
    if (s.frequency === 'weekly' && s.dayOfWeek != null) {
      label += ` (${DAY_NAMES[s.dayOfWeek!]})`;
    }
    if (s.frequency === 'monthly' && s.dayOfMonth != null) {
      label += ` (Day ${s.dayOfMonth})`;
    }
    return `${label} @ ${s.time}`;
  };

  // ── Schedule Columns ────────────────────────────────

  const scheduleColumns = useMemo<ColumnDef<ReportSchedule>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        cell: (_v: unknown, row: ReportSchedule) => (
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.category} / {row.reportType}
            </p>
          </div>
        ),
      },
      {
        id: 'frequency',
        accessorKey: 'frequency',
        header: 'Schedule',
        cell: (_v: unknown, row: ReportSchedule) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {buildFrequencyLabel(row)}
          </div>
        ),
      },
      {
        id: 'format',
        accessorKey: 'format',
        header: 'Format',
        cell: (_v: unknown, row: ReportSchedule) => (
          <Badge variant={FORMAT_BADGES[row.format] ?? 'outline'}>{row.format.toUpperCase()}</Badge>
        ),
      },
      {
        id: 'deliveryMethod',
        accessorKey: 'deliveryMethod',
        header: 'Delivery',
        cell: (_v: unknown, row: ReportSchedule) => {
          const Icon = DELIVERY_ICONS[row.deliveryMethod] || Mail;
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <Icon className="h-3.5 w-3.5" />
              <span className="capitalize">{row.deliveryMethod}</span>
              {(row.emailAddresses?.length ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">({row.emailAddresses.length})</span>
              )}
            </div>
          );
        },
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: 'Status',
        cell: (_v: unknown, row: ReportSchedule) => (
          <Badge variant={row.isActive ? 'default' : 'outline'}>
            {row.isActive ? 'Active' : 'Paused'}
          </Badge>
        ),
      },
      {
        id: 'nextRunAt',
        accessorKey: 'nextRunAt',
        header: 'Next Run',
        cell: (_v: unknown, row: ReportSchedule) => (
          <span className="text-sm">{fmtDate(row.nextRunAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (_v: unknown, row: ReportSchedule) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Schedule actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  runNow.mutate(row._id, {
                    onSuccess: () => toast.success(t('reports.scheduled.toast.triggered')),
                    onError: () => toast.error(t('reports.scheduled.toast.triggerFailed')),
                  });
                }}
              >
                <Play className="me-2 h-4 w-4" />
                {t('reports.scheduled.action.runNow')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  updateSchedule.mutate(
                    { id: row._id, isActive: !row.isActive },
                    {
                      onSuccess: () =>
                        toast.success(
                          row.isActive
                            ? t('reports.scheduled.toast.paused')
                            : t('reports.scheduled.toast.resumed'),
                        ),
                      onError: () => toast.error(t('reports.scheduled.toast.updateFailed')),
                    },
                  );
                }}
              >
                {row.isActive ? (
                  <>
                    <Pause className="me-2 h-4 w-4" />
                    {t('reports.scheduled.action.pause')}
                  </>
                ) : (
                  <>
                    <Play className="me-2 h-4 w-4" />
                    {t('reports.scheduled.action.resume')}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="me-2 h-4 w-4" />
                {t('reports.scheduled.action.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [locale, fmtDate, runNow, updateSchedule],
  );

  // ── History Columns ─────────────────────────────────

  const historyColumns = useMemo<ColumnDef<ReportHistory>[]>(
    () => [
      {
        id: 'reportType',
        accessorKey: 'reportType',
        header: 'Report',
        cell: (_v: unknown, row: ReportHistory) => (
          <div>
            <p className="font-medium">{row.reportType}</p>
            <p className="text-xs text-muted-foreground">{row.category}</p>
          </div>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        cell: (_v: unknown, row: ReportHistory) => (
          <Badge variant={STATUS_COLORS[row.status] ?? 'outline'}>{row.status}</Badge>
        ),
      },
      {
        id: 'format',
        accessorKey: 'format',
        header: 'Format',
        cell: (_v: unknown, row: ReportHistory) => (
          <Badge variant={FORMAT_BADGES[row.format] ?? 'outline'}>{row.format.toUpperCase()}</Badge>
        ),
      },
      {
        id: 'triggeredBy',
        accessorKey: 'triggeredBy',
        header: 'Trigger',
        cell: (_v: unknown, row: ReportHistory) => (
          <span className="text-sm capitalize">{row.triggeredBy}</span>
        ),
      },
      {
        id: 'rowCount',
        accessorKey: 'rowCount',
        header: 'Rows',
        cell: (_v: unknown, row: ReportHistory) => (
          <span className="text-sm">{row.rowCount?.toLocaleString() ?? '—'}</span>
        ),
      },
      {
        id: 'fileSize',
        accessorKey: 'fileSize',
        header: 'Size',
        cell: (_v: unknown, row: ReportHistory) => (
          <span className="text-sm">{fmtSize(row.fileSize ?? null)}</span>
        ),
      },
      {
        id: 'generatedAt',
        accessorKey: 'generatedAt',
        header: 'Generated',
        cell: (_v: unknown, row: ReportHistory) => (
          <span className="text-sm">{fmtDate(row.generatedAt)}</span>
        ),
      },
      {
        id: 'error',
        accessorKey: 'error',
        header: '',
        cell: (_v: unknown, row: ReportHistory) =>
          row.error ? (
            <span className="text-xs text-destructive" title={row.error}>
              Error
            </span>
          ) : null,
      },
    ],
    [locale, fmtDate],
  );

  // ── Render ──────────────────────────────────────────

  const schedules = schedulesQuery.data?.schedules ?? [];
  const history = historyQuery.data?.history ?? [];
  const isLoading = activeTab === 'schedules' ? schedulesQuery.isLoading : historyQuery.isLoading;
  const isError = activeTab === 'schedules' ? schedulesQuery.isError : historyQuery.isError;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t('reports.scheduled.title')}
        description="Manage automated report generation schedules and review history"
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.filter((s) => s.isActive).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schedules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {history.filter((h) => h.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {history.filter((h) => h.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'schedules' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('schedules')}
        >
          <CalendarClock className="me-2 h-4 w-4" />
          Schedules ({schedules.length})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('history')}
        >
          <History className="me-2 h-4 w-4" />
          History ({history.length})
        </Button>
        <div className="ms-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              schedulesQuery.refetch();
              historyQuery.refetch();
            }}
          >
            <RefreshCw className="me-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton columns={6} rows={5} />
      ) : isError ? (
        <ErrorState
          title="Failed to load data"
          message="Could not fetch scheduled reports data"
          onRetry={() =>
            activeTab === 'schedules' ? schedulesQuery.refetch() : historyQuery.refetch()
          }
        />
      ) : activeTab === 'schedules' ? (
        schedules.length === 0 ? (
          <EmptyState
            icon={<CalendarClock className="h-7 w-7" />}
            title="No scheduled reports"
            description="Create report schedules from the Reports category pages to automate report generation"
          />
        ) : (
          <DataTable columns={scheduleColumns} data={schedules} />
        )
      ) : history.length === 0 ? (
        <EmptyState
          icon={<History className="h-7 w-7" />}
          title="No report history"
          description="Generated reports will appear here once schedules run"
        />
      ) : (
        <DataTable columns={historyColumns} data={history} />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Delete Schedule"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteSchedule.mutate(deleteTarget._id, {
              onSuccess: () => {
                toast.success(t('reports.scheduled.toast.deleted'));
                setDeleteTarget(null);
              },
              onError: () => toast.error(t('reports.scheduled.toast.deleteFailed')),
            });
          }
        }}
      />
    </div>
  );
}
