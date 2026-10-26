/**
 * Appointment Page — Calendar view with create/detail workflows.
 * BUILD_RULES §8.1, §15.2 — Phase 3 Week 8.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useAppointmentList,
  useCreateAppointment,
  useUpdateAppointmentStatus,
  useCancelAppointment,
  useRescheduleAppointment,
  useAppointmentDetail,
  type AppointmentItem,
} from '../hooks/useAppointments.js';
import { AppointmentCalendar } from '../components/AppointmentCalendar.js';
import type { CalendarExtraEvent } from '../components/AppointmentCalendar.js';
import { AppointmentForm } from '../components/AppointmentForm.js';
import { AppointmentDetailPanel } from '../components/AppointmentDetailPanel.js';
import { useCbctList } from '@/features/cbct/hooks/useCbct.js';
import type { CreateAppointmentInput, AppointmentStatus } from '@dento/shared';
import { PageHeader, Button, Dialog, DialogContent, ConfirmDialog, toast } from '@dento/ui';
import { CalendarDays, Loader2 } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState.js';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../../stores/locale.store.js';

export default function AppointmentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Date range for calendar fetch ─────────────────────
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date().toISOString().split('T')[0]!,
    to: new Date(Date.now() + 7 * 86_400_000).toISOString().split('T')[0]!,
  });

  // ── Query ─────────────────────────────────────────────
  const { data, isLoading, isFetching, isError, error, refetch } = useAppointmentList({
    page: 1,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    limit: 100,
    sortBy: 'date',
    sortOrder: 'asc',
  });

  // ── CBCT orders for calendar ──────────────────────────
  const { data: cbctData } = useCbctList({
    scheduledDateFrom: dateRange.from,
    scheduledDateTo: dateRange.to,
    status: 'scheduled',
    limit: 100,
  });

  const cbctCalendarEvents: CalendarExtraEvent[] = useMemo(
    () =>
      (cbctData?.items ?? [])
        .filter((o) => o.scheduledDate)
        .map((o) => {
          const dateStr = o.scheduledDate!.split('T')[0];
          const time = o.scheduledTime || '09:00';
          return {
            id: o._id,
            title: `CBCT: ${o.orderNumber}`,
            start: `${dateStr}T${time}`,
            color: '#14B8A6', // teal-500
            type: 'cbct',
          };
        }),
    [cbctData],
  );

  // ── Mutations ─────────────────────────────────────────
  const createMutation = useCreateAppointment();
  const statusMutation = useUpdateAppointmentStatus();
  const cancelMutation = useCancelAppointment();
  const rescheduleMutation = useRescheduleAppointment();

  // ── Dialog/panel state ────────────────────────────────
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDefaults, setCreateDefaults] = useState<Partial<CreateAppointmentInput>>({});
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  // ── Auto-open create dialog when navigated here with prefill query params ──
  // (e.g. "Book Follow-up" from ProcedureNoteDetailPage)
  useEffect(() => {
    if (showCreateDialog) return;
    const patientId = searchParams.get('patientId');
    const doctorId = searchParams.get('doctorId');
    const branchId = searchParams.get('branchId');
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');
    const chairNumber = searchParams.get('chairNumber');
    const source = searchParams.get('source');
    const notes = searchParams.get('notes');
    if (!patientId && !doctorId && !date) return;
    const defaults: Partial<CreateAppointmentInput> = {};
    if (patientId) defaults.patientId = patientId;
    if (doctorId) defaults.doctorId = doctorId;
    if (branchId) defaults.branchId = branchId;
    if (date) defaults.date = date;
    if (startTime) defaults.startTime = startTime;
    if (chairNumber) {
      const n = Number(chairNumber);
      if (Number.isFinite(n) && n > 0) defaults.chairNumber = n;
    }
    if (notes) defaults.notes = notes;
    if (
      source &&
      (['admin', 'website', 'phone', 'walk_in', 'referral', 'whatsapp'] as const).includes(
        source as 'admin',
      )
    ) {
      defaults.source = source as CreateAppointmentInput['source'];
    }
    setCreateDefaults(defaults);
    setShowCreateDialog(true);
    // Clear params so the dialog doesn't reopen if the user closes it.
    const next = new URLSearchParams(searchParams);
    [
      'patientId',
      'doctorId',
      'branchId',
      'date',
      'startTime',
      'chairNumber',
      'source',
      'notes',
    ].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Fetch detail for sheet
  const { data: selectedApt } = useAppointmentDetail(selectedAptId ?? '');

  // ── Handlers ──────────────────────────────────────────

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setDateRange({ from: start, to: end });
  }, []);

  const handleDateSelect = useCallback((_start: string, _end: string) => {
    const date = _start.split('T')[0] ?? '';
    const startTime = _start.split('T')[1]?.substring(0, 5) ?? '09:00';
    const endTime = _end.split('T')[1]?.substring(0, 5) ?? '09:30';
    setCreateDefaults({ date, startTime, endTime });
    setShowCreateDialog(true);
  }, []);

  const handleEventClick = useCallback((appointmentId: string) => {
    setSelectedAptId(appointmentId);
  }, []);

  const handleCreateSubmit = async (formData: CreateAppointmentInput) => {
    try {
      await createMutation.mutateAsync(formData);
      setShowCreateDialog(false);
      toast.success(t('appointments.toast.booked'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('appointments.toast.bookFailed');
      toast.error(message);
    }
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    try {
      await statusMutation.mutateAsync({ id, status });
      toast.success(t('appointments.toast.statusUpdated'));
      setSelectedAptId(null);
    } catch {
      toast.error(t('appointments.toast.statusFailed'));
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMutation.mutateAsync({ id: cancelTarget });
      toast.success(t('appointments.toast.cancelled'));
      setCancelTarget(null);
      setSelectedAptId(null);
    } catch {
      toast.error(t('appointments.toast.cancelFailed'));
    }
  };

  const handleEventDrop = useCallback(
    async (id: string, date: string, startTime: string, endTime: string, revert: () => void) => {
      try {
        await rescheduleMutation.mutateAsync({ id, date, startTime, endTime });
        toast.success(t('appointments.toast.rescheduled'));
      } catch {
        revert();
        toast.error(t('appointments.toast.rescheduleFailed'));
      }
    },
    [rescheduleMutation],
  );

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t('appointments.title')} description={t('appointments.subtitle')}>
        <Button
          onClick={() => {
            setCreateDefaults({});
            setShowCreateDialog(true);
          }}
        >
          <CalendarDays className="me-2 h-4 w-4" />
          {t('appointments.bookBtn')}
        </Button>
      </PageHeader>

      {isError && !data ? (
        <ErrorState
          title={t('appointments.error.load')}
          message={error?.message}
          onRetry={refetch}
        />
      ) : isLoading && !data ? (
        <div
          className="flex h-96 items-center justify-center rounded-xl border bg-white dark:bg-gray-900"
          role="status"
          aria-label="Loading appointments"
        >
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="relative">
          {isFetching && (
            <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
              <div className="rounded-b-lg bg-primary/90 px-3 py-1 text-xs text-primary-foreground shadow">
                <Loader2 className="me-1 inline h-3 w-3 animate-spin" />
                {t('appointments.loading')}
              </div>
            </div>
          )}
          <AppointmentCalendar
            appointments={data?.appointments ?? []}
            extraEvents={cbctCalendarEvents}
            onEventClick={handleEventClick}
            onExtraEventClick={(id, type) => {
              if (type === 'cbct') navigate(`/cbct/${id}`);
            }}
            onDateSelect={handleDateSelect}
            onDateRangeChange={handleDateRangeChange}
            onEventDrop={handleEventDrop}
          />
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AppointmentForm
            defaultValues={createDefaults}
            onSubmit={handleCreateSubmit}
            isPending={createMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <AppointmentDetailPanel
        appointment={(selectedApt as AppointmentItem) ?? null}
        open={!!selectedAptId}
        onClose={() => setSelectedAptId(null)}
        onStatusChange={handleStatusChange}
        onCancel={(id) => setCancelTarget(id)}
      />

      {/* Cancel Confirmation */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title={t('appointments.confirm.cancelTitle')}
        description={t('appointments.confirm.cancelDesc')}
        confirmLabel={t('appointments.confirm.cancelBtn')}
        onConfirm={handleCancelConfirm}
        variant="destructive"
      />
    </div>
  );
}
