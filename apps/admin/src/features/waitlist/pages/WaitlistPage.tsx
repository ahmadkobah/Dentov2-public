/**
 * Waitlist Page — Phase 6.5
 *
 * List + add + cancel waitlist entries. Per-row priority badge and patient
 * link. Admin-only — gated by `appointments` module.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SearchCombobox,
} from '@dento/ui';
import { Plus, Clock, Trash2, AlertTriangle, CalendarPlus } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton.js';
import { ErrorState } from '@/components/ErrorState.js';
import { usePatientList } from '@/features/patients/hooks/usePatients.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useBranchList } from '@/features/branches/hooks/useBranches.js';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm.js';
import { useCreateAppointment } from '@/features/appointments/hooks/useAppointments.js';
import { useTranslation } from '@/stores/locale.store.js';
import type { CreateAppointmentInput } from '@dento/shared';
import {
  useWaitlistList,
  useCreateWaitlistEntry,
  useCancelWaitlistEntry,
  type WaitlistEntry,
  type WaitlistStatus,
  type WaitlistPriority,
} from '../hooks/useWaitlist.js';
import { ApiError } from '@/lib/api-client.js';

const PRIORITY_VARIANT: Record<WaitlistPriority, 'default' | 'secondary' | 'destructive'> = {
  normal: 'secondary',
  high: 'default',
  urgent: 'destructive',
};

const STATUS_VARIANT: Record<WaitlistStatus, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    active: 'default',
    notified: 'secondary',
    booked: 'outline',
    cancelled: 'destructive',
    expired: 'destructive',
  };

function patientLabel(p: WaitlistEntry['patientId']): string {
  if (typeof p === 'string') return p;
  return `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode || p._id;
}

function doctorLabel(
  d: WaitlistEntry['doctorId'],
  labels: { anyDoctor: string; doctorFallback: string },
): string {
  if (!d) return labels.anyDoctor;
  if (typeof d === 'string') return d;
  return `${d.firstName?.en ?? ''} ${d.lastName?.en ?? ''}`.trim() || labels.doctorFallback;
}

export default function WaitlistPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | 'all'>('active');
  const [page] = useState(1);

  const { data, isLoading, isError, error, refetch } = useWaitlistList({
    status: statusFilter === 'all' ? undefined : statusFilter,
    page,
    limit: 50,
  });

  const cancelMutation = useCancelWaitlistEntry();
  const [createOpen, setCreateOpen] = useState(false);
  const [bookEntry, setBookEntry] = useState<WaitlistEntry | null>(null);

  async function handleCancel(id: string) {
    if (!confirm(t('waitlist.removeConfirm', 'Remove this entry from the waitlist?'))) return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success(t('waitlist.removed', 'Removed from waitlist'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('waitlist.failed', 'Failed'));
    }
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('waitlist.title', 'Waitlist')}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              'waitlist.subtitle',
              'Patients waiting for an earlier slot. Cancellations auto-notify the next match.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as WaitlistStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('waitlist.allStatuses', 'All statuses')}</SelectItem>
                <SelectItem value="active">{t('waitlist.status.active', 'Active')}</SelectItem>
                <SelectItem value="notified">
                  {t('waitlist.status.notified', 'Notified')}
                </SelectItem>
                <SelectItem value="booked">{t('waitlist.status.booked', 'Booked')}</SelectItem>
                <SelectItem value="cancelled">
                  {t('waitlist.status.cancelled', 'Cancelled')}
                </SelectItem>
                <SelectItem value="expired">{t('waitlist.status.expired', 'Expired')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('waitlist.add', 'Add to waitlist')}
          </Button>
        </div>
      </div>

      {isLoading && <TableSkeleton columns={5} rows={6} />}
      {isError && (
        <ErrorState
          title={t('waitlist.failedLoad', 'Failed to load waitlist')}
          message={error?.message}
          onRetry={refetch}
        />
      )}
      {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
          {t('waitlist.empty', 'No waitlist entries match this filter.')}
        </div>
      )}
      {!isLoading && !isError && (data?.items.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start">
              <tr>
                <th className="px-3 py-2">{t('waitlist.patient', 'Patient')}</th>
                <th className="px-3 py-2">{t('waitlist.doctor', 'Doctor')}</th>
                <th className="px-3 py-2">{t('waitlist.window', 'Window')}</th>
                <th className="px-3 py-2">{t('waitlist.duration', 'Duration')}</th>
                <th className="px-3 py-2">{t('waitlist.priority', 'Priority')}</th>
                <th className="px-3 py-2">{t('waitlist.status', 'Status')}</th>
                <th className="px-3 py-2 text-end">{t('waitlist.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((entry) => {
                const patientId =
                  typeof entry.patientId === 'string' ? entry.patientId : entry.patientId._id;
                return (
                  <tr key={entry._id} className="border-t">
                    <td className="px-3 py-2">
                      <button
                        className="text-primary hover:underline"
                        onClick={() => navigate(`/patients/${patientId}`)}
                      >
                        {patientLabel(entry.patientId)}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      {doctorLabel(entry.doctorId, {
                        anyDoctor: t('waitlist.anyDoctor', 'Any doctor'),
                        doctorFallback: t('waitlist.doctorFallback', 'Doctor'),
                      })}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.preferredFrom.slice(0, 10)} → {entry.preferredTo.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">
                      {entry.durationMinutes} {t('waitlist.min', 'min')}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={PRIORITY_VARIANT[entry.priority]} className="capitalize">
                        {t(`waitlist.priority.${entry.priority}`, entry.priority)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={STATUS_VARIANT[entry.status]} className="capitalize">
                        {t(`waitlist.status.${entry.status}`, entry.status)}
                      </Badge>
                      {entry.notificationCount > 0 && (
                        <span className="ms-2 text-xs text-muted-foreground">
                          ×{entry.notificationCount}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-end">
                      {(entry.status === 'active' || entry.status === 'notified') && (
                        <div className="inline-flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setBookEntry(entry)}
                            aria-label={t('waitlist.bookAppointment', 'Book appointment')}
                          >
                            <CalendarPlus className="me-1 h-4 w-4" />
                            {t('waitlist.book', 'Book')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(entry._id)}
                            aria-label={t('waitlist.remove', 'Remove')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateWaitlistDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <BookFromWaitlistDialog
        entry={bookEntry}
        onClose={(booked) => {
          if (booked && bookEntry) {
            // Remove the now-booked entry from the active waitlist
            cancelMutation.mutate(bookEntry._id);
          }
          setBookEntry(null);
        }}
      />
    </div>
  );
}

// ── Book-from-waitlist dialog ───────────────────────────────
//
// Reuses the full AppointmentForm so every required field (date, time,
// type, chair, etc.) is validated by the same Zod schema as the regular
// booking flow. Missing fields are surfaced inline by the form itself.

function BookFromWaitlistDialog({
  entry,
  onClose,
}: {
  entry: WaitlistEntry | null;
  onClose: (booked: boolean) => void;
}) {
  const create = useCreateAppointment();
  const { t } = useTranslation();

  const defaults = useMemo<Partial<CreateAppointmentInput> | undefined>(() => {
    if (!entry) return undefined;
    const patientId = typeof entry.patientId === 'string' ? entry.patientId : entry.patientId._id;
    const doctorId =
      entry.doctorId == null
        ? undefined
        : typeof entry.doctorId === 'string'
          ? entry.doctorId
          : entry.doctorId._id;
    // Suggest the first day of the preferred window as a starting date
    const date = entry.preferredFrom.slice(0, 10);
    const startTime = entry.preferredTimeStart || '';
    return {
      patientId,
      branchId: entry.branchId,
      doctorId,
      date,
      startTime: startTime || undefined,
      durationMinutes: entry.durationMinutes,
      notes: entry.reason || entry.notes,
      source: 'admin',
    } as Partial<CreateAppointmentInput>;
  }, [entry]);

  const handleSubmit = async (data: CreateAppointmentInput) => {
    try {
      await create.mutateAsync(data);
      toast.success(t('waitlist.booked', 'Appointment booked from waitlist'));
      onClose(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('waitlist.failedBook', 'Failed to book appointment');
      toast.error(message);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(v) => (v ? null : onClose(false))}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {entry && (
          <AppointmentForm
            defaultValues={defaults}
            onSubmit={handleSubmit}
            isPending={create.isPending}
            mode="create"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Create dialog ───────────────────────────────────────────

function CreateWaitlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateWaitlistEntry();
  const { t } = useTranslation();

  // Lookup data — same hooks the appointment booking form uses
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: doctorData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const { data: branchData } = useBranchList({ page: 1, limit: 100, isActive: true });

  const patientOptions = useMemo(
    () =>
      (patientData?.patients ?? []).map((p) => ({
        value: p._id,
        label: `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode,
        description: p.phone || p.email || p.patientCode,
      })),
    [patientData],
  );
  const doctorOptions = useMemo(
    () => [
      {
        value: '',
        label: t('waitlist.anyDoctor', 'Any doctor'),
        description: t('waitlist.anyDoctorDescription', 'No specific doctor preference'),
      },
      ...(doctorData?.items ?? []).map((d) => ({
        value: d._id,
        label: `${d.firstName} ${d.lastName}`.trim(),
        description: d.specialization,
      })),
    ],
    [doctorData, t],
  );
  const branchOptions = useMemo(
    () =>
      (branchData?.items ?? []).map((b) => ({
        value: b._id,
        label: b.name?.en ?? b.code,
        description: b.code,
      })),
    [branchData],
  );

  const [form, setForm] = useState({
    patientId: '',
    branchId: '',
    doctorId: '',
    preferredFrom: '',
    preferredTo: '',
    durationMinutes: 30,
    priority: 'normal' as WaitlistPriority,
    reason: '',
  });
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.patientId || !form.branchId || !form.preferredFrom || !form.preferredTo) {
      setError(t('waitlist.requiredFields', 'Patient, branch, and date window are required.'));
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        patientId: form.patientId.trim(),
        branchId: form.branchId.trim(),
        doctorId: form.doctorId.trim() || undefined,
        preferredFrom: new Date(form.preferredFrom).toISOString(),
        preferredTo: new Date(form.preferredTo).toISOString(),
        durationMinutes: form.durationMinutes,
        priority: form.priority,
        reason: form.reason.trim() || undefined,
      });
      toast.success(t('waitlist.added', 'Added to waitlist'));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error ? err.message : t('waitlist.failedCreate', 'Failed to create'),
        );
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('waitlist.add', 'Add to waitlist')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>{t('waitlist.patient', 'Patient')}</Label>
              <SearchCombobox
                options={patientOptions}
                value={form.patientId}
                onValueChange={(v) => setForm({ ...form, patientId: v })}
                placeholder={t('waitlist.selectPatient', 'Select patient…')}
                searchPlaceholder={t('waitlist.searchPatients', 'Search by name, phone, code…')}
                emptyMessage={t('waitlist.noPatients', 'No patients found')}
              />
            </div>
            <div>
              <Label>{t('waitlist.branch', 'Branch')}</Label>
              <SearchCombobox
                options={branchOptions}
                value={form.branchId}
                onValueChange={(v) => setForm({ ...form, branchId: v })}
                placeholder={t('waitlist.selectBranch', 'Select branch…')}
                searchPlaceholder={t('waitlist.searchBranches', 'Search branches…')}
                emptyMessage={t('waitlist.noBranches', 'No branches found')}
              />
            </div>
          </div>
          <div>
            <Label>
              {t('waitlist.doctorOptional', 'Doctor (optional, leave as “Any doctor” for any)')}
            </Label>
            <SearchCombobox
              options={doctorOptions}
              value={form.doctorId}
              onValueChange={(v) => setForm({ ...form, doctorId: v })}
              placeholder={t('waitlist.anyDoctor', 'Any doctor')}
              searchPlaceholder={t('waitlist.searchDoctors', 'Search doctors…')}
              emptyMessage={t('waitlist.noDoctors', 'No doctors found')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wl-from">{t('waitlist.preferredFrom', 'Preferred from')}</Label>
              <Input
                id="wl-from"
                type="date"
                value={form.preferredFrom}
                onChange={(e) => setForm({ ...form, preferredFrom: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="wl-to">{t('waitlist.preferredTo', 'Preferred to')}</Label>
              <Input
                id="wl-to"
                type="date"
                value={form.preferredTo}
                onChange={(e) => setForm({ ...form, preferredTo: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wl-duration">{t('waitlist.durationMin', 'Duration (min)')}</Label>
              <Input
                id="wl-duration"
                type="number"
                min={5}
                max={480}
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: Number(e.target.value) || 30 })
                }
              />
            </div>
            <div>
              <Label>{t('waitlist.priority', 'Priority')}</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as WaitlistPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t('waitlist.priority.normal', 'Normal')}</SelectItem>
                  <SelectItem value="high">{t('waitlist.priority.high', 'High')}</SelectItem>
                  <SelectItem value="urgent">{t('waitlist.priority.urgent', 'Urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="wl-reason">{t('waitlist.reasonOptional', 'Reason (optional)')}</Label>
            <Input
              id="wl-reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.actions.cancel', 'Cancel')}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? t('waitlist.adding', 'Adding…') : t('common.actions.add', 'Add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
