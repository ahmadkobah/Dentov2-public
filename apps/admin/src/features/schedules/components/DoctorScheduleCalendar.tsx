import { useState, useMemo } from 'react';
import {
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  ConfirmDialog,
  toast,
} from '@dento/ui';
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, X } from 'lucide-react';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import type { Doctor } from '@/features/doctors/hooks/useDoctors.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import type { DoctorSchedule } from '../hooks/useSchedules.js';
import {
  useDoctorScheduleList,
  useCreateDoctorSchedule,
  useUpdateDoctorSchedule,
  useDeleteDoctorSchedule,
  useScheduleExceptionList,
} from '../hooks/useSchedules.js';
import { useLeaveRequestList } from '@/features/leave/hooks/useLeave.js';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Helpers ─────────────────────────────────────────────── */

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Produce array of YYYY-MM-DD strings from start to end inclusive */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (d <= last) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

interface BlockedEntry {
  doctorId: string; // could be Doctor._id or User._id
  type: 'exception' | 'leave';
  label: string; // "Vacation", "Sick Leave", etc.
}

/* ── Component ───────────────────────────────────────────── */

export default function DoctorScheduleCalendar() {
  const { t } = useTranslation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<DoctorSchedule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DoctorSchedule | null>(null);

  // Data
  const { data: schedules, isLoading, isError, error, refetch } = useDoctorScheduleList({});
  const { data: doctorsData } = useDoctorList({ limit: 100 });
  const { data: branches } = useActiveBranches();

  const doctors = useMemo(() => doctorsData?.items ?? [], [doctorsData]);
  const doctorMap = useMemo(() => {
    const m = new Map<string, Doctor>();
    for (const d of doctors) {
      m.set(d._id, d);
      m.set(d.userId, d); // also map by userId for leave-synced exceptions
    }
    return m;
  }, [doctors]);

  // Exceptions & Leave Requests
  const { data: exceptionsData } = useScheduleExceptionList({ status: 'approved', limit: 100 });
  const { data: leavesData } = useLeaveRequestList({ status: 'approved', limit: 100 });

  /** Map date → BlockedEntry[] for approved exceptions */
  const blockedByDate = useMemo(() => {
    const map = new Map<string, BlockedEntry[]>();
    // Exceptions
    for (const ex of exceptionsData?.exceptions ?? []) {
      if (!ex.isActive || !ex.isFullDay) continue;
      const s = ex.startDate.slice(0, 10);
      const e = ex.endDate.slice(0, 10);
      const label = ex.exceptionType
        .replace(/_/g, ' ')
        .replace(/\b[a-z]/g, (c: string) => c.toUpperCase());
      for (const dt of dateRange(s, e)) {
        const arr = map.get(dt) ?? [];
        // Avoid duplicates (leave sync creates both a leave + exception)
        if (!arr.some((b) => b.doctorId === ex.doctorId && b.type === 'exception')) {
          arr.push({ doctorId: ex.doctorId, type: 'exception', label });
        }
        map.set(dt, arr);
      }
    }
    // Leave requests
    for (const lr of leavesData?.requests ?? []) {
      if (!lr.isActive) continue;
      const s = lr.startDate.slice(0, 10);
      const e = lr.endDate.slice(0, 10);
      for (const dt of dateRange(s, e)) {
        const arr = map.get(dt) ?? [];
        // Don't duplicate if exception already covers same doctor
        if (!arr.some((b) => b.doctorId === lr.userId)) {
          arr.push({ doctorId: lr.userId, type: 'leave', label: 'Leave' });
        }
        map.set(dt, arr);
      }
    }
    return map;
  }, [exceptionsData, leavesData]);

  const allSchedules = useMemo(() => schedules?.schedules ?? [], [schedules]);

  // Group schedules by date string → for override, and by dayOfWeek → for recurring
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, DoctorSchedule[]>();
    for (const s of allSchedules) {
      if (!s.isActive) continue;
      if (s.scheduleType === 'override' && s.specificDate) {
        // specificDate may come as ISO datetime "2026-04-01T00:00:00.000Z" — normalize to YYYY-MM-DD
        const dateKey = s.specificDate.slice(0, 10);
        const existing = map.get(dateKey) ?? [];
        existing.push(s);
        map.set(dateKey, existing);
      }
    }
    return map;
  }, [allSchedules]);

  const recurringByDay = useMemo(() => {
    const map = new Map<number, DoctorSchedule[]>();
    for (const s of allSchedules) {
      if (!s.isActive) continue;
      if (s.scheduleType === 'recurring' && s.dayOfWeek !== undefined) {
        const existing = map.get(s.dayOfWeek) ?? [];
        existing.push(s);
        map.set(s.dayOfWeek, existing);
      }
    }
    return map;
  }, [allSchedules]);

  function isBlockedDoctor(doctorId: string, dateStr: string) {
    const blocked = blockedByDate.get(dateStr);
    if (!blocked) return false;
    // Check by Doctor._id and also by doctor.userId
    const doc = doctorMap.get(doctorId);
    return blocked.some((b) => b.doctorId === doctorId || (doc && b.doctorId === doc.userId));
  }

  function getSchedulesForDate(dateStr: string, dayOfWeek: number) {
    // Override schedules take priority; if none, fall back to recurring
    const overrides = schedulesByDate.get(dateStr);
    const raw =
      overrides && overrides.length > 0 ? overrides : (recurringByDay.get(dayOfWeek) ?? []);
    // Filter out doctors with approved exception / leave on this date
    return raw.filter((s) => !isBlockedDoctor(s.doctorId, dateStr));
  }

  function getBlockedForDate(dateStr: string): BlockedEntry[] {
    return blockedByDate.get(dateStr) ?? [];
  }

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  function getDoctorLabel(doctorId: string) {
    const d = doctorMap.get(doctorId);
    if (!d) return 'Unknown';
    return `${d.title ? d.title + ' ' : ''}${d.firstName} ${d.lastName}`;
  }

  function getDoctorColor(doctorId: string) {
    const d = doctorMap.get(doctorId);
    return d?.color ?? '#3b82f6';
  }

  // Selected date schedules
  const selectedDayOfWeek = selectedDate ? new Date(selectedDate).getDay() : 0;
  const selectedSchedules = selectedDate
    ? getSchedulesForDate(selectedDate, selectedDayOfWeek)
    : [];
  const selectedBlocked = selectedDate ? getBlockedForDate(selectedDate) : [];

  const handleOpenAdd = () => {
    setEditItem(null);
    setDialogOpen(true);
  };

  if (isLoading) return <TableSkeleton columns={7} rows={5} />;
  if (isError)
    return <ErrorState title="Failed to load" message={error?.message} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {/* ── Calendar Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToday}>
            {t('schedules.calendar.today')}
          </Button>
        </div>
      </div>

      {/* ── Calendar Grid ───────────────────────────────── */}
      <div className="rounded-lg border overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-sm font-medium text-muted-foreground border-b"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Leading empty cells */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border-b border-e bg-muted/30" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatDate(year, month, day);
            const dow = (firstDay + i) % 7;
            const daySchedules = getSchedulesForDate(dateStr, dow);
            const dayBlocked = getBlockedForDate(dateStr);
            const allChips = [
              ...daySchedules.map((s) => ({
                key: s._id,
                color: getDoctorColor(s.doctorId),
                name: getDoctorLabel(s.doctorId),
                opacity: 1,
                title: `${getDoctorLabel(s.doctorId)} ${s.startTime}–${s.endTime}`,
              })),
              ...dayBlocked.map((b) => ({
                key: `blocked-${b.doctorId}`,
                color: getDoctorColor(b.doctorId),
                name: getDoctorLabel(b.doctorId),
                opacity: 0.45,
                title: `${getDoctorLabel(b.doctorId)} — ${b.label}`,
              })),
            ];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-e p-1 cursor-pointer transition-colors hover:bg-accent/50 ${
                  isSelected ? 'bg-accent ring-2 ring-primary ring-inset' : ''
                } ${isToday ? 'bg-primary/5' : ''}`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div
                  className={`text-sm font-medium mb-1 ${isToday ? 'text-primary font-bold' : 'text-foreground'}`}
                >
                  {day}
                </div>
                <div className="space-y-0.5">
                  {allChips.slice(0, 3).map((c) => (
                    <div
                      key={c.key}
                      className="text-[11px] leading-tight rounded px-1 py-0.5 truncate text-white"
                      style={{ backgroundColor: c.color, opacity: c.opacity }}
                      title={c.title}
                    >
                      {c.name.split(' ').slice(-1)[0]}
                    </div>
                  ))}
                  {allChips.length > 3 && (
                    <div className="text-[10px] text-muted-foreground px-1">
                      +{allChips.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trailing empty cells */}
          {(() => {
            const totalCells = firstDay + daysInMonth;
            const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            return Array.from({ length: remaining }).map((_, i) => (
              <div key={`trail-${i}`} className="min-h-[100px] border-b border-e bg-muted/30" />
            ));
          })()}
        </div>
      </div>

      {/* ── Selected Day Panel ──────────────────────────── */}
      {selectedDate && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleOpenAdd}>
                <Plus className="me-2 h-4 w-4" /> {t('schedules.calendar.addSchedule')}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedSchedules.length === 0 && selectedBlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors scheduled for this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedSchedules.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: getDoctorColor(s.doctorId) }}
                    />
                    <div>
                      <p className="font-medium text-sm">{getDoctorLabel(s.doctorId)}</p>
                      <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
                        <span>
                          {s.startTime} – {s.endTime}
                        </span>
                        {s.isRamadanSchedule && (
                          <Badge variant="secondary" className="text-[10px]">
                            Ramadan
                          </Badge>
                        )}
                        {!s.isAvailable && (
                          <Badge variant="outline" className="text-[10px]">
                            Unavailable
                          </Badge>
                        )}
                        <Badge
                          variant={s.scheduleType === 'override' ? 'destructive' : 'default'}
                          className="text-[10px]"
                        >
                          {s.scheduleType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditItem(s);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {/* Blocked entries (exceptions / leaves) at 50% opacity */}
              {selectedBlocked.map((b) => (
                <div
                  key={`blocked-${b.doctorId}`}
                  className="flex items-center rounded-md border border-dashed p-3"
                  style={{ opacity: 0.5 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: getDoctorColor(b.doctorId) }}
                    />
                    <div>
                      <p className="font-medium text-sm">{getDoctorLabel(b.doctorId)}</p>
                      <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {b.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {b.type === 'exception' ? 'Exception' : 'Leave'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Dialog ───────────────────────────── */}
      <DoctorDayDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dateStr={selectedDate}
        editItem={editItem}
        doctors={doctors}
        branches={branches ?? []}
        blockedDoctorIds={selectedBlocked.map((b) => b.doctorId)}
      />

      {/* ── Delete Confirm ──────────────────────────────── */}
      <DeleteConfirm
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        getDoctorLabel={getDoctorLabel}
      />
    </div>
  );
}

/* ── Add / Edit Dialog ───────────────────────────────────── */

interface Branch {
  _id: string;
  name: string | { en: string; ar?: string };
}

function DoctorDayDialog({
  open,
  onOpenChange,
  dateStr,
  editItem,
  doctors,
  branches,
  blockedDoctorIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateStr: string | null;
  editItem: DoctorSchedule | null;
  doctors: Doctor[];
  branches: Branch[];
  blockedDoctorIds: string[];
}) {
  const createMutation = useCreateDoctorSchedule();
  const updateMutation = useUpdateDoctorSchedule();
  const { t } = useTranslation();

  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isRamadan, setIsRamadan] = useState(false);

  // Reset form on open
  // Sync form when dialog opens
  if (open && editItem && doctorId !== editItem.doctorId) {
    setDoctorId(editItem.doctorId);
    setBranchId(editItem.branchId);
    setStartTime(editItem.startTime);
    setEndTime(editItem.endTime);
    setIsAvailable(editItem.isAvailable);
    setIsRamadan(editItem.isRamadanSchedule);
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Reset on close
      setDoctorId('');
      setBranchId('');
      setStartTime('09:00');
      setEndTime('17:00');
      setIsAvailable(true);
      setIsRamadan(false);
    }
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    if (!editItem && (!doctorId || !branchId)) {
      toast.error(t('schedules.doctorSchedule.validation.required'));
      return;
    }
    if (!dateStr && !editItem) {
      toast.error(t('schedules.calendar.selectDateFirst'));
      return;
    }
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem._id,
          data: { startTime, endTime, isAvailable, isRamadanSchedule: isRamadan },
        });
        toast.success(t('schedules.doctorSchedule.toast.updated'));
      } else {
        await createMutation.mutateAsync({
          doctorId,
          branchId,
          scheduleType: 'override' as const,
          specificDate: dateStr!,
          startTime,
          endTime,
          slotDuration: 30, // API requires it; we just send default
          isAvailable,
          isRamadanSchedule: isRamadan,
        });
        toast.success(t('schedules.calendar.doctorAdded'));
      }
      handleOpenChange(false);
    } catch {
      toast.error(
        editItem
          ? t('schedules.doctorSchedule.toast.updateFailed')
          : t('schedules.doctorSchedule.toast.createFailed'),
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editItem
              ? t('schedules.doctorSchedule.editTitle')
              : t('schedules.calendar.addDoctorOfDay')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {dateStr && (
            <p className="text-sm text-muted-foreground">
              {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
          {!editItem && (
            <>
              <div className="space-y-2">
                <Label>{t('schedules.doctorSchedule.doctor')} *</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedules.doctorSchedule.selectDoctor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors
                      .filter(
                        (d) =>
                          !blockedDoctorIds.includes(d._id) && !blockedDoctorIds.includes(d.userId),
                      )
                      .map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.title ? `${d.title} ` : ''}
                          {d.firstName} {d.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('schedules.doctorSchedule.branch')} *</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedules.doctorSchedule.selectBranch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {typeof b.name === 'object' ? b.name.en : b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.doctorSchedule.startTime')}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.doctorSchedule.endTime')}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.doctorSchedule.available')}</Label>
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.doctorSchedule.ramadanSchedule')}</Label>
            <Switch checked={isRamadan} onCheckedChange={setIsRamadan} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('schedules.exception.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? t('schedules.action.saving')
              : editItem
                ? t('schedules.action.update')
                : t('schedules.calendar.addSchedule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete Confirm ──────────────────────────────────────── */

function DeleteConfirm({
  target,
  onClose,
  getDoctorLabel,
}: {
  target: DoctorSchedule | null;
  onClose: () => void;
  getDoctorLabel: (id: string) => string;
}) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteDoctorSchedule();

  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Remove Doctor Schedule"
      description={
        target
          ? `Remove ${getDoctorLabel(target.doctorId)} (${target.startTime}–${target.endTime}) from this day?`
          : ''
      }
      confirmLabel="Remove"
      variant="destructive"
      onConfirm={async () => {
        if (!target) return;
        try {
          await deleteMutation.mutateAsync(target._id);
          toast.success(t('schedules.doctorSchedule.toast.deleted'));
        } catch {
          toast.error(t('schedules.doctorSchedule.toast.deleteFailed'));
        }
        onClose();
      }}
    />
  );
}
