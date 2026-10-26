/**
 * Schedules Page — Tabbed management for Doctor Schedules, Exceptions,
 * Shift Templates, Staff Schedules, Leave, and Attendance.
 * BUILD_RULES §8.1, §15.2 — Phase 3 Week 9.
 */

import { useState, useMemo } from 'react';
import { formatDate } from '@/lib/date.js';
import {
  useScheduleExceptionList,
  useReviewScheduleException,
  useShiftTemplateList,
  useStaffScheduleList,
  useDeleteShiftTemplate,
  useDeleteStaffSchedule,
  type ScheduleException,
  type ShiftTemplate,
  type StaffSchedule,
} from '../hooks/useSchedules.js';
import {
  useLeaveTypeList,
  useLeaveRequestList,
  useReviewLeaveRequest,
  useLeaveBalanceList,
  useDeleteLeaveType,
  useCancelLeaveRequest,
  type LeaveType,
  type LeaveRequest,
  type LeaveBalance,
} from '@/features/leave/hooks/useLeave.js';
import {
  useAttendanceList,
  useClockIn,
  useClockOut,
  useStartBreak,
  useEndBreak,
  type AttendanceRecord,
} from '@/features/attendance/hooks/useAttendance.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import {
  DataTable,
  EmptyState,
  PageHeader,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  ConfirmDialog,
  type ColumnDef,
  toast,
} from '@dento/ui';
import {
  Clock,
  CalendarDays,
  CalendarClock,
  Users,
  CalendarOff,
  ListTree,
  BarChart3,
  Coffee,
  LogIn,
  LogOut,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import type { Doctor } from '@/features/doctors/hooks/useDoctors.js';
import DoctorScheduleCalendar from '../components/DoctorScheduleCalendar.js';
import ExceptionDialog from '../components/ExceptionDialog.js';
import ShiftTemplateDialog from '../components/ShiftTemplateDialog.js';
import StaffScheduleDialog from '../components/StaffScheduleDialog.js';
import LeaveTypeDialog from '../components/LeaveTypeDialog.js';
import LeaveRequestDialog from '../components/LeaveRequestDialog.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Status badge variant map ────────────────────────── */

const EXCEPTION_STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

const REQUEST_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
  };

const ATTENDANCE_STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  present: 'default',
  late: 'secondary',
  absent: 'destructive',
  half_day: 'outline',
  on_leave: 'outline',
  holiday: 'default',
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SchedulesPage() {
  const { t } = useTranslation();
  const locale = useThemeStore((s) => s.locale);
  const lang = locale === 'ar' ? 'ar' : 'en';

  const [activeTab, setActiveTab] = useState('doctor-schedules');

  // ── Dialog state ──────────────────────────────────────
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [editShift, setEditShift] = useState<ShiftTemplate | null>(null);
  const [deleteShiftTarget, setDeleteShiftTarget] = useState<ShiftTemplate | null>(null);

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editStaffSchedule, setEditStaffSchedule] = useState<StaffSchedule | null>(null);
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<StaffSchedule | null>(null);

  const [leaveTypeDialogOpen, setLeaveTypeDialogOpen] = useState(false);
  const [editLeaveType, setEditLeaveType] = useState<LeaveType | null>(null);
  const [deleteLeaveTypeTarget, setDeleteLeaveTypeTarget] = useState<LeaveType | null>(null);

  const [leaveRequestDialogOpen, setLeaveRequestDialogOpen] = useState(false);
  const [cancelLeaveTarget, setCancelLeaveTarget] = useState<LeaveRequest | null>(null);

  // ── Doctor lookup for names ───────────────────────────
  const { data: doctorsData } = useDoctorList({ limit: 100 });
  const doctorByIdMap = useMemo(() => {
    const m = new Map<string, Doctor>();
    for (const d of doctorsData?.items ?? []) {
      m.set(d._id, d); // lookup by Doctor._id (normal exceptions)
      m.set(d.userId, d); // lookup by User._id (leave-synced exceptions & leave requests)
    }
    return m;
  }, [doctorsData]);
  function getDoctorLabel(id: string) {
    const d = doctorByIdMap.get(id);
    if (!d) return 'Unknown';
    return `${d.title ? d.title + ' ' : ''}${d.firstName} ${d.lastName}`;
  }

  // ── Delete mutations ──────────────────────────────────
  const deleteShiftMutation = useDeleteShiftTemplate();
  const deleteStaffMutation = useDeleteStaffSchedule();
  const deleteLeaveTypeMutation = useDeleteLeaveType();
  const cancelLeaveRequestMutation = useCancelLeaveRequest();

  // ── Schedule Exceptions ───────────────────────────────
  const {
    data: exceptions,
    isLoading: exceptionsLoading,
    isError: exceptionsError,
    error: exceptionsErr,
    refetch: refetchExceptions,
  } = useScheduleExceptionList({});

  const reviewException = useReviewScheduleException();

  const exceptionColumns: ColumnDef<ScheduleException>[] = [
    {
      id: 'doctor',
      header: t('schedules.exception.col.doctor'),
      accessorFn: (row) => getDoctorLabel(row.doctorId),
    },
    {
      id: 'exceptionType',
      header: t('schedules.exception.col.type'),
      accessorFn: (row) =>
        row.exceptionType.replace(/_/g, ' ').replace(/\b[a-z]/g, (c: string) => c.toUpperCase()),
    },
    {
      id: 'dates',
      header: t('schedules.exception.col.period'),
      accessorFn: (row) => {
        const s = formatDate(row.startDate);
        const e = formatDate(row.endDate);
        return s === e ? s : `${s} → ${e}`;
      },
    },
    {
      id: 'isFullDay',
      header: t('schedules.exception.col.fullDay'),
      cell: (_v: unknown, row: ScheduleException) =>
        row.isFullDay ? 'Yes' : t('schedules.exception.partial'),
    },
    {
      id: 'status',
      header: t('schedules.exception.col.status'),
      cell: (_v: unknown, row: ScheduleException) => (
        <Badge variant={EXCEPTION_STATUS_VARIANT[row.status] ?? 'outline'}>{row.status}</Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: ScheduleException) =>
        row.status === 'pending' ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={async () => {
                try {
                  await reviewException.mutateAsync({
                    id: row._id,
                    data: { status: 'approved' },
                  });
                  toast.success(t('schedules.exception.toast.approved'));
                } catch {
                  toast.error(t('schedules.exception.toast.approveFailed'));
                }
              }}
            >
              {t('schedules.exception.action.approve')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  await reviewException.mutateAsync({
                    id: row._id,
                    data: { status: 'rejected', rejectionReason: 'Rejected by admin' },
                  });
                  toast.success(t('schedules.exception.toast.rejected'));
                } catch {
                  toast.error(t('schedules.exception.toast.rejectFailed'));
                }
              }}
            >
              {t('schedules.exception.action.reject')}
            </Button>
          </div>
        ) : null,
    },
  ];

  // ── Shift Templates ───────────────────────────────────
  const {
    data: shifts,
    isLoading: shiftsLoading,
    isError: shiftsError,
    error: shiftsErr,
    refetch: refetchShifts,
  } = useShiftTemplateList({});

  const shiftColumns: ColumnDef<ShiftTemplate>[] = [
    {
      id: 'name',
      header: t('schedules.shift.col.name'),
      accessorFn: (row) => row.name[lang] || row.name.en,
    },
    {
      id: 'shiftType',
      header: t('schedules.shift.col.type'),
      accessorFn: (row) =>
        row.shiftType.replace(/_/g, ' ').replace(/\b[a-z]/g, (c: string) => c.toUpperCase()),
    },
    {
      id: 'time',
      header: t('schedules.shift.col.time'),
      accessorFn: (row) => `${row.startTime} – ${row.endTime}`,
    },
    {
      id: 'breakDuration',
      header: t('schedules.shift.col.breakMin'),
      accessorFn: (row) => row.breakDuration,
    },
    {
      id: 'isDefault',
      header: t('schedules.shift.col.default'),
      cell: (_v: unknown, row: ShiftTemplate) => (row.isDefault ? <Badge>Default</Badge> : '—'),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: ShiftTemplate) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditShift(row);
                setShiftDialogOpen(true);
              }}
            >
              <Pencil className="me-2 h-4 w-4" /> {t('schedules.action.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteShiftTarget(row)}
            >
              <Trash2 className="me-2 h-4 w-4" /> {t('schedules.action.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Staff Schedules ───────────────────────────────────
  const {
    data: staffSchedules,
    isLoading: staffLoading,
    isError: staffError,
    error: staffErr,
    refetch: refetchStaff,
  } = useStaffScheduleList({});

  const staffColumns: ColumnDef<StaffSchedule>[] = [
    {
      id: 'role',
      header: t('schedules.staff.col.role'),
      accessorFn: (row) =>
        row.role?.replace(/_/g, ' ').replace(/\b[a-z]/g, (c: string) => c.toUpperCase()) ?? '—',
    },
    {
      id: 'dayOrDate',
      header: t('schedules.staff.col.dayOrDate'),
      accessorFn: (row) =>
        row.scheduleDate ? row.scheduleDate.slice(0, 10) : (DAY_LABELS[row.dayOfWeek ?? 0] ?? '—'),
    },
    {
      id: 'time',
      header: t('schedules.staff.col.time'),
      accessorFn: (row) => `${row.startTime} – ${row.endTime}`,
    },
    {
      id: 'status',
      header: t('schedules.staff.col.status'),
      accessorFn: (row) => row.status,
    },
    {
      id: 'isPublished',
      header: t('schedules.staff.col.published'),
      cell: (_v: unknown, row: StaffSchedule) =>
        row.isPublished ? (
          <Badge>{t('schedules.staff.badge.published')}</Badge>
        ) : (
          <Badge variant="outline">{t('schedules.staff.badge.draft')}</Badge>
        ),
    },
    {
      id: 'isRamadan',
      header: t('schedules.staff.col.ramadan'),
      cell: (_v: unknown, row: StaffSchedule) =>
        row.isRamadanSchedule ? <Badge variant="secondary">Yes</Badge> : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: StaffSchedule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditStaffSchedule(row);
                setStaffDialogOpen(true);
              }}
            >
              <Pencil className="me-2 h-4 w-4" /> {t('schedules.action.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteStaffTarget(row)}
            >
              <Trash2 className="me-2 h-4 w-4" /> {t('schedules.action.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // ── Leave ─────────────────────────────────────────────
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<string | undefined>(undefined);
  const [leaveTab, setLeaveTab] = useState('requests');

  const {
    data: leaveTypesData,
    isLoading: leaveTypesLoading,
    isError: leaveTypesError,
    error: leaveTypesErr,
    refetch: refetchLeaveTypes,
  } = useLeaveTypeList({});

  const {
    data: leaveRequestsData,
    isLoading: leaveRequestsLoading,
    isError: leaveRequestsError,
    error: leaveRequestsErr,
    refetch: refetchLeaveRequests,
  } = useLeaveRequestList({ status: leaveStatusFilter });

  const reviewLeaveRequest = useReviewLeaveRequest();

  const {
    data: leaveBalances,
    isLoading: leaveBalancesLoading,
    isError: leaveBalancesError,
    error: leaveBalancesErr,
    refetch: refetchLeaveBalances,
  } = useLeaveBalanceList({});

  const leaveTypeColumns: ColumnDef<LeaveType>[] = [
    {
      id: 'name',
      header: t('schedules.leaveType.col.name'),
      accessorFn: (row) => row.name[lang] || row.name.en,
      sortable: true,
    },
    { id: 'code', header: t('schedules.leaveType.col.code'), accessorFn: (row) => row.code },
    {
      id: 'maxDaysPerYear',
      header: t('schedules.leaveType.col.maxDays'),
      accessorFn: (row) => row.maxDaysPerYear,
    },
    {
      id: 'isPaid',
      header: t('schedules.leaveType.col.paid'),
      cell: (_v: unknown, row: LeaveType) => (
        <Badge variant={row.isPaid ? 'default' : 'outline'}>
          {row.isPaid ? t('schedules.leaveType.badge.paid') : t('schedules.leaveType.badge.unpaid')}
        </Badge>
      ),
    },
    {
      id: 'isApprovalRequired',
      header: t('schedules.leaveType.col.approval'),
      cell: (_v: unknown, row: LeaveType) =>
        row.isApprovalRequired ? (
          <Badge variant="secondary">{t('schedules.leaveType.badge.required')}</Badge>
        ) : (
          <Badge variant="outline">{t('schedules.leaveType.badge.auto')}</Badge>
        ),
    },
    {
      id: 'color',
      header: t('schedules.leaveType.col.color'),
      cell: (_v: unknown, row: LeaveType) =>
        row.color ? (
          <span
            className="inline-block h-4 w-4 rounded-full"
            style={{ backgroundColor: row.color }}
          />
        ) : (
          '—'
        ),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: LeaveType) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setEditLeaveType(row);
                setLeaveTypeDialogOpen(true);
              }}
            >
              <Pencil className="me-2 h-4 w-4" /> {t('schedules.action.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteLeaveTypeTarget(row)}
            >
              <Trash2 className="me-2 h-4 w-4" /> {t('schedules.action.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const leaveRequestColumns: ColumnDef<LeaveRequest>[] = [
    {
      id: 'user',
      header: t('schedules.leaveRequest.col.doctorStaff'),
      accessorFn: (row) => getDoctorLabel(row.userId),
    },
    {
      id: 'dates',
      header: t('schedules.leaveRequest.col.period'),
      accessorFn: (row) => {
        const s = formatDate(row.startDate);
        const e = formatDate(row.endDate);
        return s === e ? s : `${s} → ${e}`;
      },
    },
    {
      id: 'totalDays',
      header: t('schedules.leaveRequest.col.days'),
      accessorFn: (row) => row.totalDays,
    },
    {
      id: 'reason',
      header: t('schedules.leaveRequest.col.reason'),
      accessorFn: (row) => row.reason || '—',
    },
    {
      id: 'status',
      header: t('schedules.leaveRequest.col.status'),
      cell: (_v: unknown, row: LeaveRequest) => (
        <Badge variant={REQUEST_STATUS_VARIANT[row.status] ?? 'outline'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      id: 'createdAt',
      header: t('schedules.leaveRequest.col.requested'),
      accessorFn: (row) => formatDate(row.createdAt),
    },
    {
      id: 'actions',
      header: '',
      cell: (_v: unknown, row: LeaveRequest) => {
        const canReview = row.status === 'pending';
        const canCancel = row.status === 'pending' || row.status === 'approved';
        if (!canReview && !canCancel) return null;
        return (
          <div className="flex gap-2">
            {canReview && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={async () => {
                    try {
                      await reviewLeaveRequest.mutateAsync({
                        id: row._id,
                        data: { status: 'approved' },
                      });
                      toast.success(t('schedules.leaveRequest.toast.approved'));
                    } catch {
                      toast.error(t('schedules.leaveRequest.toast.approveFailed'));
                    }
                  }}
                >
                  {t('schedules.leaveRequest.action.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await reviewLeaveRequest.mutateAsync({
                        id: row._id,
                        data: { status: 'rejected', rejectionReason: 'Rejected by admin' },
                      });
                      toast.success(t('schedules.leaveRequest.toast.rejected'));
                    } catch {
                      toast.error(t('schedules.leaveRequest.toast.rejectFailed'));
                    }
                  }}
                >
                  {t('schedules.leaveRequest.action.reject')}
                </Button>
              </>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" onClick={() => setCancelLeaveTarget(row)}>
                {t('schedules.leaveRequest.action.cancel')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const leaveBalanceColumns: ColumnDef<LeaveBalance>[] = [
    { id: 'year', header: t('schedules.leaveBalance.col.year'), accessorFn: (row) => row.year },
    {
      id: 'totalAllowance',
      header: t('schedules.leaveBalance.col.total'),
      accessorFn: (row) => row.totalAllowance,
    },
    {
      id: 'usedDays',
      header: t('schedules.leaveBalance.col.used'),
      accessorFn: (row) => row.usedDays,
    },
    {
      id: 'remainingDays',
      header: t('schedules.leaveBalance.col.remaining'),
      accessorFn: (row) => row.remainingDays,
    },
    {
      id: 'carriedForward',
      header: t('schedules.leaveBalance.col.carriedForward'),
      accessorFn: (row) => row.carriedForward,
    },
  ];

  // ── Attendance ────────────────────────────────────────
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    isError: attendanceError,
    error: attendanceErr,
    refetch: refetchAttendance,
  } = useAttendanceList({ status: attendanceStatusFilter });

  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();

  const attendanceColumns: ColumnDef<AttendanceRecord>[] = [
    {
      id: 'date',
      header: t('schedules.attendance.col.date'),
      accessorFn: (row) => formatDate(row.date),
      sortable: true,
    },
    {
      id: 'checkIn',
      header: t('schedules.attendance.col.checkIn'),
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
      header: t('schedules.attendance.col.checkOut'),
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
      header: t('schedules.attendance.col.hours'),
      accessorFn: (row) => (row.actualHours ? row.actualHours.toFixed(1) : '—'),
    },
    {
      id: 'lateMinutes',
      header: t('schedules.attendance.col.lateMin'),
      cell: (_v: unknown, row: AttendanceRecord) =>
        row.lateMinutes > 0 ? <Badge variant="destructive">{row.lateMinutes}</Badge> : '—',
    },
    {
      id: 'overtime',
      header: t('schedules.attendance.col.overtimeMin'),
      cell: (_v: unknown, row: AttendanceRecord) =>
        row.overtime > 0 ? <Badge variant="secondary">{row.overtime}</Badge> : '—',
    },
    {
      id: 'status',
      header: t('schedules.attendance.col.status'),
      cell: (_v: unknown, row: AttendanceRecord) => (
        <Badge variant={ATTENDANCE_STATUS_VARIANT[row.status] ?? 'outline'}>
          {row.status.replace(/_/g, ' ').replace(/\b[a-z]/g, (c: string) => c.toUpperCase())}
        </Badge>
      ),
    },
  ];

  // ── Tab content renderer helper ───────────────────────
  function renderTab<T>(
    loading: boolean,
    isErr: boolean,
    err: Error | null,
    refetch: () => void,
    data: T[] | undefined,
    columns: ColumnDef<T>[],
    emptyIcon: React.ReactNode,
    emptyTitle: string,
    emptyDesc: string,
  ) {
    if (loading) return <TableSkeleton columns={columns.length} rows={6} />;
    if (isErr)
      return <ErrorState title="Failed to load" message={err?.message} onRetry={refetch} />;
    if (!data?.length) {
      return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDesc} />;
    }
    return (
      <DataTable columns={columns} data={data} rowKey={(row) => (row as { _id: string })._id} />
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('schedules.title')} description={t('schedules.subtitle')} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="doctor-schedules">
            <CalendarDays className="me-2 h-4 w-4" />
            {t('schedules.tab.doctorSchedules')}
          </TabsTrigger>
          <TabsTrigger value="exceptions">
            <CalendarClock className="me-2 h-4 w-4" />
            {t('schedules.tab.exceptions')}
          </TabsTrigger>
          <TabsTrigger value="shifts">
            <Clock className="me-2 h-4 w-4" />
            {t('schedules.tab.shiftTemplates')}
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="me-2 h-4 w-4" />
            {t('schedules.tab.staffSchedules')}
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarOff className="me-2 h-4 w-4" />
            {t('schedules.tab.leave')}
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <BarChart3 className="me-2 h-4 w-4" />
            {t('schedules.tab.attendance')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="doctor-schedules" className="mt-4">
          <DoctorScheduleCalendar />
        </TabsContent>

        <TabsContent value="exceptions" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setExceptionDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" /> {t('schedules.exception.addButton')}
            </Button>
          </div>
          {renderTab(
            exceptionsLoading,
            exceptionsError,
            exceptionsErr,
            refetchExceptions,
            exceptions?.exceptions,
            exceptionColumns,
            <CalendarClock className="h-7 w-7" />,
            t('schedules.empty.exceptions'),
            t('schedules.empty.exceptionsDesc'),
          )}
        </TabsContent>

        <TabsContent value="shifts" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditShift(null);
                setShiftDialogOpen(true);
              }}
            >
              <Plus className="me-2 h-4 w-4" /> {t('schedules.shift.addButton')}
            </Button>
          </div>
          {renderTab(
            shiftsLoading,
            shiftsError,
            shiftsErr,
            refetchShifts,
            shifts?.shifts,
            shiftColumns,
            <Clock className="h-7 w-7" />,
            t('schedules.empty.shifts'),
            t('schedules.empty.shiftsDesc'),
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditStaffSchedule(null);
                setStaffDialogOpen(true);
              }}
            >
              <Plus className="me-2 h-4 w-4" /> {t('schedules.staff.addButton')}
            </Button>
          </div>
          {renderTab(
            staffLoading,
            staffError,
            staffErr,
            refetchStaff,
            staffSchedules?.schedules,
            staffColumns,
            <Users className="h-7 w-7" />,
            t('schedules.empty.staff'),
            t('schedules.empty.staffDesc'),
          )}
        </TabsContent>

        {/* ── Leave Tab ──────────────────────────────────── */}
        <TabsContent value="leave" className="mt-4 space-y-4">
          <Tabs value={leaveTab} onValueChange={setLeaveTab}>
            <TabsList>
              <TabsTrigger value="requests">
                <CalendarOff className="me-2 h-4 w-4" />
                {t('schedules.leave.tab.requests')}
              </TabsTrigger>
              <TabsTrigger value="types">
                <ListTree className="me-2 h-4 w-4" />
                {t('schedules.leave.tab.types')}
              </TabsTrigger>
              <TabsTrigger value="balances">
                <BarChart3 className="me-2 h-4 w-4" />
                {t('schedules.leave.tab.balances')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Select
                  value={leaveStatusFilter ?? 'all'}
                  onValueChange={(v) => setLeaveStatusFilter(v === 'all' ? undefined : v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder={t('schedules.leave.filter.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('schedules.leave.filter.allStatuses')}</SelectItem>
                    <SelectItem value="pending">{t('schedules.leave.filter.pending')}</SelectItem>
                    <SelectItem value="approved">{t('schedules.leave.filter.approved')}</SelectItem>
                    <SelectItem value="rejected">{t('schedules.leave.filter.rejected')}</SelectItem>
                    <SelectItem value="cancelled">
                      {t('schedules.leave.filter.cancelled')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setLeaveRequestDialogOpen(true)}>
                  <Plus className="me-2 h-4 w-4" /> {t('schedules.leaveRequest.addButton')}
                </Button>
              </div>
              {renderTab(
                leaveRequestsLoading,
                leaveRequestsError,
                leaveRequestsErr,
                refetchLeaveRequests,
                leaveRequestsData?.requests,
                leaveRequestColumns,
                <CalendarOff className="h-7 w-7" />,
                t('schedules.empty.leaveRequests'),
                t('schedules.empty.leaveRequestsDesc'),
              )}
            </TabsContent>

            <TabsContent value="types" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setEditLeaveType(null);
                    setLeaveTypeDialogOpen(true);
                  }}
                >
                  <Plus className="me-2 h-4 w-4" /> {t('schedules.leaveType.addButton')}
                </Button>
              </div>
              {renderTab(
                leaveTypesLoading,
                leaveTypesError,
                leaveTypesErr,
                refetchLeaveTypes,
                leaveTypesData?.types,
                leaveTypeColumns,
                <ListTree className="h-7 w-7" />,
                t('schedules.empty.leaveTypes'),
                t('schedules.empty.leaveTypesDesc'),
              )}
            </TabsContent>

            <TabsContent value="balances" className="mt-4">
              {renderTab(
                leaveBalancesLoading,
                leaveBalancesError,
                leaveBalancesErr,
                refetchLeaveBalances,
                leaveBalances,
                leaveBalanceColumns,
                <BarChart3 className="h-7 w-7" />,
                t('schedules.empty.leaveBalances'),
                t('schedules.empty.leaveBalancesDesc'),
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ── Attendance Tab ─────────────────────────────── */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={async () => {
                try {
                  await clockIn.mutateAsync({ branchId: '' });
                  toast.success(t('schedules.attendance.toast.clockedIn'));
                } catch {
                  toast.error(t('schedules.attendance.toast.clockInFailed'));
                }
              }}
              disabled={clockIn.isPending}
            >
              <LogIn className="me-2 h-4 w-4" />
              {t('schedules.attendance.clockIn')}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await clockOut.mutateAsync({});
                  toast.success(t('schedules.attendance.toast.clockedOut'));
                } catch {
                  toast.error(t('schedules.attendance.toast.clockOutFailed'));
                }
              }}
              disabled={clockOut.isPending}
            >
              <LogOut className="me-2 h-4 w-4" />
              {t('schedules.attendance.clockOut')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await startBreak.mutateAsync();
                  toast.success(t('schedules.attendance.toast.breakStarted'));
                } catch {
                  toast.error(t('schedules.attendance.toast.breakStartFailed'));
                }
              }}
              disabled={startBreak.isPending}
            >
              <Coffee className="me-2 h-4 w-4" />
              {t('schedules.attendance.startBreak')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await endBreak.mutateAsync();
                  toast.success(t('schedules.attendance.toast.breakEnded'));
                } catch {
                  toast.error(t('schedules.attendance.toast.breakEndFailed'));
                }
              }}
              disabled={endBreak.isPending}
            >
              <Coffee className="me-2 h-4 w-4" />
              {t('schedules.attendance.endBreak')}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Select
              value={attendanceStatusFilter ?? 'all'}
              onValueChange={(v) => setAttendanceStatusFilter(v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('schedules.attendance.filter.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('schedules.attendance.filter.allStatuses')}</SelectItem>
                <SelectItem value="present">{t('schedules.attendance.filter.present')}</SelectItem>
                <SelectItem value="late">{t('schedules.attendance.filter.late')}</SelectItem>
                <SelectItem value="absent">{t('schedules.attendance.filter.absent')}</SelectItem>
                <SelectItem value="half_day">{t('schedules.attendance.filter.halfDay')}</SelectItem>
                <SelectItem value="on_leave">{t('schedules.attendance.filter.onLeave')}</SelectItem>
                <SelectItem value="holiday">{t('schedules.attendance.filter.holiday')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderTab(
            attendanceLoading,
            attendanceError,
            attendanceErr,
            refetchAttendance,
            attendanceData?.records,
            attendanceColumns,
            <BarChart3 className="h-7 w-7" />,
            t('schedules.empty.attendance'),
            t('schedules.empty.attendanceDesc'),
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────── */}
      <ExceptionDialog open={exceptionDialogOpen} onOpenChange={setExceptionDialogOpen} />
      <ShiftTemplateDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        editItem={editShift}
      />
      <StaffScheduleDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        editItem={editStaffSchedule}
      />
      <LeaveTypeDialog
        open={leaveTypeDialogOpen}
        onOpenChange={setLeaveTypeDialogOpen}
        editItem={editLeaveType}
      />
      <LeaveRequestDialog open={leaveRequestDialogOpen} onOpenChange={setLeaveRequestDialogOpen} />

      {/* ── Delete Confirm Dialogs ───────────────────────── */}
      <ConfirmDialog
        open={!!deleteShiftTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteShiftTarget(null);
        }}
        title="Delete Shift Template"
        description="Are you sure you want to delete this shift template? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteShiftTarget) return;
          try {
            await deleteShiftMutation.mutateAsync(deleteShiftTarget._id);
            toast.success(t('schedules.shift.toast.deleted'));
          } catch {
            toast.error(t('schedules.shift.toast.deleteFailed'));
          }
          setDeleteShiftTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteStaffTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteStaffTarget(null);
        }}
        title="Delete Staff Schedule"
        description="Are you sure you want to delete this staff schedule? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteStaffTarget) return;
          try {
            await deleteStaffMutation.mutateAsync(deleteStaffTarget._id);
            toast.success(t('schedules.staff.toast.deleted'));
          } catch {
            toast.error(t('schedules.staff.toast.deleteFailed'));
          }
          setDeleteStaffTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteLeaveTypeTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteLeaveTypeTarget(null);
        }}
        title="Delete Leave Type"
        description="Are you sure you want to delete this leave type? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (!deleteLeaveTypeTarget) return;
          try {
            await deleteLeaveTypeMutation.mutateAsync(deleteLeaveTypeTarget._id);
            toast.success(t('schedules.leaveType.toast.deleted'));
          } catch {
            toast.error(t('schedules.leaveType.toast.deleteFailed'));
          }
          setDeleteLeaveTypeTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!cancelLeaveTarget}
        onOpenChange={(open) => {
          if (!open) setCancelLeaveTarget(null);
        }}
        title="Cancel Leave Request"
        description="Are you sure you want to cancel this leave request?"
        confirmLabel="Cancel Request"
        variant="destructive"
        onConfirm={async () => {
          if (!cancelLeaveTarget) return;
          try {
            await cancelLeaveRequestMutation.mutateAsync(cancelLeaveTarget._id);
            toast.success(t('schedules.leaveRequest.toast.cancelled'));
          } catch {
            toast.error(t('schedules.leaveRequest.toast.cancelFailed'));
          }
          setCancelLeaveTarget(null);
        }}
      />
    </div>
  );
}
