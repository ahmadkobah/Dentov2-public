/**
 * Attendance Page — Clock in/out, break tracking, and attendance records.
 * BUILD_RULES §8.1, §15.2 — Phase 3 Week 9.
 */

import { useState } from 'react';
import {
  useAttendanceList,
  useClockIn,
  useClockOut,
  useStartBreak,
  useEndBreak,
  type AttendanceRecord,
} from '../hooks/useAttendance.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ColumnDef,
  toast,
} from '@dento/ui';
import { BarChart3, Coffee, LogIn, LogOut } from 'lucide-react';
import { useTranslation } from '../../../stores/locale.store.js';
import { formatDate } from '@/lib/date.js';

/* ── Status badge variant map ────────────────────────── */

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  present: 'default',
  late: 'secondary',
  absent: 'destructive',
  half_day: 'outline',
  on_leave: 'outline',
  holiday: 'default',
};

export default function AttendancePage() {
  const { t } = useTranslation();
  // ── Filters ───────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ── Query ─────────────────────────────────────────────
  const {
    data: attendanceData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAttendanceList({ status: statusFilter });

  // ── Mutations ─────────────────────────────────────────
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();

  // ── Columns ───────────────────────────────────────────
  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      id: 'date',
      header: t('attendance.col.date'),
      accessorFn: (row) => formatDate(row.date),
      sortable: true,
    },
    {
      id: 'checkIn',
      header: t('attendance.col.checkIn'),
      accessorFn: (row) =>
        row.checkIn
          ? new Date(row.checkIn).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
    {
      id: 'checkOut',
      header: t('attendance.col.checkOut'),
      accessorFn: (row) =>
        row.checkOut
          ? new Date(row.checkOut).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—',
    },
    {
      id: 'actualHours',
      header: t('attendance.col.hours'),
      accessorFn: (row) => (row.actualHours ? row.actualHours.toFixed(1) : '—'),
    },
    {
      id: 'lateMinutes',
      header: t('attendance.col.late'),
      cell: (_v: unknown, row: AttendanceRecord) =>
        row.lateMinutes > 0 ? <Badge variant="destructive">{row.lateMinutes}</Badge> : '—',
    },
    {
      id: 'overtime',
      header: t('attendance.col.overtime'),
      cell: (_v: unknown, row: AttendanceRecord) =>
        row.overtime > 0 ? <Badge variant="secondary">{row.overtime}</Badge> : '—',
    },
    {
      id: 'status',
      header: t('attendance.col.status'),
      cell: (_v: unknown, row: AttendanceRecord) => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'outline'}>
          {row.status.replace(/_/g, ' ').replace(/\b[a-z]/g, (c: string) => c.toUpperCase())}
        </Badge>
      ),
    },
  ];

  // ── Quick‑action handlers ─────────────────────────────

  const handleClockIn = async () => {
    try {
      await clockIn.mutateAsync({ branchId: '' });
      toast.success(t('attendance.toast.clockedIn'));
    } catch {
      toast.error(t('attendance.toast.clockInFailed'));
    }
  };

  const handleClockOut = async () => {
    try {
      await clockOut.mutateAsync({});
      toast.success(t('attendance.toast.clockedOut'));
    } catch {
      toast.error(t('attendance.toast.clockOutFailed'));
    }
  };

  const handleStartBreak = async () => {
    try {
      await startBreak.mutateAsync();
      toast.success(t('attendance.toast.breakStarted'));
    } catch {
      toast.error(t('attendance.toast.breakStartFailed'));
    }
  };

  const handleEndBreak = async () => {
    try {
      await endBreak.mutateAsync();
      toast.success(t('attendance.toast.breakEnded'));
    } catch {
      toast.error(t('attendance.toast.breakEndFailed'));
    }
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('attendance.title')} description={t('attendance.subtitle')}>
        <div className="flex gap-2">
          <Button onClick={handleClockIn} disabled={clockIn.isPending}>
            <LogIn className="me-2 h-4 w-4" />
            {t('attendance.clockIn')}
          </Button>
          <Button variant="outline" onClick={handleClockOut} disabled={clockOut.isPending}>
            <LogOut className="me-2 h-4 w-4" />
            {t('attendance.clockOut')}
          </Button>
          <Button variant="secondary" onClick={handleStartBreak} disabled={startBreak.isPending}>
            <Coffee className="me-2 h-4 w-4" />
            {t('attendance.startBreak')}
          </Button>
          <Button variant="secondary" onClick={handleEndBreak} disabled={endBreak.isPending}>
            <Coffee className="me-2 h-4 w-4" />
            {t('attendance.endBreak')}
          </Button>
        </div>
      </PageHeader>

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter ?? 'all'}
          onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t('attendance.filter.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('attendance.filter.allStatuses')}</SelectItem>
            <SelectItem value="present">{t('attendance.filter.present')}</SelectItem>
            <SelectItem value="late">{t('attendance.filter.late')}</SelectItem>
            <SelectItem value="absent">{t('attendance.filter.absent')}</SelectItem>
            <SelectItem value="half_day">{t('attendance.filter.halfDay')}</SelectItem>
            <SelectItem value="on_leave">{t('attendance.filter.onLeave')}</SelectItem>
            <SelectItem value="holiday">{t('attendance.filter.holiday')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table / States */}
      {isLoading ? (
        <TableSkeleton columns={7} rows={8} />
      ) : isError ? (
        <ErrorState title={t('attendance.error.load')} message={error?.message} onRetry={refetch} />
      ) : !attendanceData?.records?.length ? (
        <EmptyState
          icon={<BarChart3 className="h-7 w-7" />}
          title={t('attendance.empty.title')}
          description={t('attendance.empty.desc')}
        />
      ) : (
        <DataTable columns={columns} data={attendanceData.records} rowKey={(row) => row._id} />
      )}
    </div>
  );
}
