/**
 * Daily Operations Hub
 * Based on DENTO_V2_MASTER_PLAN.md §18 & ADMIN_PORTAL_SCREENS.md §5
 *
 * One unified page for daily clinic operations:
 * - All today's appointments + walk-ins
 * - Waiting room overview
 * - Chair status/availability
 * - Real-time updates via Socket.io
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Armchair,
  CheckCircle2,
  XCircle,
  UserPlus,
  Phone,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PhoneInput,
  SearchCombobox,
  Dialog,
  DialogContent,
  toast,
} from '@dento/ui';
import { useTenantCountry } from '@/hooks/useTenantCountry.js';
import { Badge } from '@dento/ui';
import { Button } from '@dento/ui';
import { usePatientList, useCreatePatient } from '@/features/patients/hooks/usePatients.js';
import { PatientForm } from '@/features/patients/components/PatientForm.js';
import type { CreatePatientInput } from '@dento/shared';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import {
  useQueueList,
  useQueueStats,
  useRegisterWalkIn,
  useCallPatient,
  useStartTreatment,
  useCompleteTreatment,
  useMarkNoShow,
  useTodayAppointments,
  type WalkInEntry,
} from '../hooks/useDailyOps.js';
import { useUpdateAppointmentStatus } from '@/features/appointments/hooks/useAppointments.js';
import { useServiceList } from '@/features/services/hooks/useServices.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Types ───────────────────────────────────────────────────────────────────

type PatientType = 'appointment' | 'walk_in';
type AppointmentStatus = 'pending' | 'arrived' | 'called' | 'in_chair' | 'completed' | 'no_show';
type WalkInStatus = 'waiting' | 'called' | 'in_chair' | 'completed' | 'cancelled' | 'no_show';
type Priority = 'low' | 'normal' | 'high' | 'emergency';
type ChairStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

interface QueueEntry {
  id: string;
  queueNumber: number | null;
  patientName: string;
  patientId: string | null;
  type: PatientType;
  time: string;
  doctorId: string | null;
  doctorName: string | null;
  chairId: string | null;
  chairName: string | null;
  status: AppointmentStatus | WalkInStatus;
  priority: Priority;
  waitMinutes: number;
  reason?: string;
}

interface Chair {
  id: string;
  name: string;
  chairNumber: number;
  chairType: 'standard' | 'pediatric' | 'surgery' | 'hygiene';
  floor?: string;
  status: ChairStatus;
  currentPatient?: {
    name: string;
    doctorName: string;
    startedAt: string;
    minutesElapsed: number;
  };
}

interface Doctor {
  id: string;
  name: string;
}

// ── Tab Types ───────────────────────────────────────────────────────────────

type TabId = 'all' | 'scheduled' | 'walk_ins' | 'waiting' | 'in_chair';

const tabs: TabId[] = ['all', 'scheduled', 'walk_ins', 'waiting', 'in_chair'];

// ── Stat Card Component ─────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-8 w-8 opacity-80" />
      </div>
    </div>
  );
}

// ── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config: Record<
    string,
    { icon: string; labelKey: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
  > = {
    pending: { icon: '⏳', labelKey: 'operations.status.pending', variant: 'outline' },
    arrived: { icon: '🟢', labelKey: 'operations.status.arrived', variant: 'default' },
    waiting: { icon: '⏳', labelKey: 'operations.status.waiting', variant: 'outline' },
    called: { icon: '📢', labelKey: 'operations.status.called', variant: 'secondary' },
    in_chair: { icon: '🔴', labelKey: 'operations.status.inChair', variant: 'destructive' },
    completed: { icon: '✅', labelKey: 'operations.status.completed', variant: 'default' },
    no_show: { icon: '❌', labelKey: 'operations.status.noShow', variant: 'destructive' },
    cancelled: { icon: '🚫', labelKey: 'operations.status.cancelled', variant: 'secondary' },
  };

  const { icon, labelKey, variant } = config[status] || {
    icon: '',
    labelKey: '',
    variant: 'outline' as const,
  };

  return (
    <Badge variant={variant}>
      {[icon, labelKey ? t(labelKey) : status].filter(Boolean).join(' ')}
    </Badge>
  );
}

// ── Type Badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: PatientType }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm ${type === 'walk_in' ? 'text-orange-600' : 'text-blue-600'}`}
    >
      {type === 'walk_in' ? '🚶' : '🗓'}{' '}
      {type === 'walk_in' ? t('operations.type.walkIn') : t('operations.type.appointment')}
    </span>
  );
}

// ── Priority Badge ──────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useTranslation();
  if (priority === 'normal') return null;

  const config: Record<string, { label: string; color: string }> = {
    low: { label: t('operations.priority.low'), color: 'bg-gray-100 text-gray-700' },
    high: { label: t('operations.priority.high'), color: 'bg-orange-100 text-orange-700' },
    emergency: { label: t('operations.priority.emergency'), color: 'bg-red-100 text-red-700' },
  };

  const { label, color } = config[priority] || { label: priority, color: '' };

  return <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>{label}</span>;
}

// ── Chair Card Component ────────────────────────────────────────────────────

function ChairCard({ chair }: { chair: Chair }) {
  const { t } = useTranslation();
  const isOccupied = chair.status === 'occupied';
  const isMaintenance = chair.status === 'maintenance';

  return (
    <Card className={`${isMaintenance ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {isOccupied ? (
              <span className="text-red-500">🔴</span>
            ) : isMaintenance ? (
              <span className="text-yellow-500">🟡</span>
            ) : (
              <span className="text-green-500">🟢</span>
            )}
            <span className="font-medium">{chair.name}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {chair.chairType}
          </Badge>
        </div>
        {isOccupied && chair.currentPatient ? (
          <div className="text-sm space-y-1">
            <p className="font-medium">{chair.currentPatient.name}</p>
            <p className="text-muted-foreground">{chair.currentPatient.doctorName}</p>
            <p className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {chair.currentPatient.minutesElapsed} min
            </p>
          </div>
        ) : isMaintenance ? (
          <p className="text-sm text-muted-foreground">{t('operations.chairs.underMaintenance')}</p>
        ) : (
          <p className="text-sm text-green-600 font-medium">{t('operations.chairs.available')}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Action Buttons ──────────────────────────────────────────────────────────

interface ActionButtonsProps {
  entry: QueueEntry;
  onAction: (action: string, entry: QueueEntry) => void;
}

function ActionButtons({ entry, onAction }: ActionButtonsProps) {
  const { t } = useTranslation();
  const { status, type } = entry;

  // Pending appointment -> Arrived / No Show
  if (status === 'pending' && type === 'appointment') {
    return (
      <div className="flex gap-1">
        {/* Phase 5.10 — prominent Quick Check-In button */}
        <Button
          size="sm"
          variant="default"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={() => onAction('arrived', entry)}
        >
          <CheckCircle2 className="h-4 w-4 me-1" />
          {t('operations.action.arrived')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('no_show', entry)}>
          <XCircle className="h-4 w-4" />
          <span className="sr-only">{t('operations.action.noShow')}</span>
        </Button>
      </div>
    );
  }

  // Arrived/Waiting -> Call
  if (status === 'arrived' || status === 'waiting') {
    return (
      <Button size="sm" variant="default" onClick={() => onAction('call', entry)}>
        <Phone className="h-4 w-4 me-1" /> {t('operations.action.call')}
      </Button>
    );
  }

  // Called -> Assign Chair
  if (status === 'called') {
    return (
      <Button size="sm" variant="default" onClick={() => onAction('assign_chair', entry)}>
        <Armchair className="h-4 w-4 me-1" /> {t('operations.action.assign')}
      </Button>
    );
  }

  // In Chair -> Complete
  if (status === 'in_chair') {
    return (
      <Button size="sm" variant="default" onClick={() => onAction('complete', entry)}>
        <CheckCircle2 className="h-4 w-4 me-1" /> {t('operations.action.done')}
      </Button>
    );
  }

  // Completed -> No action
  return <span className="text-muted-foreground text-sm">{t('operations.none')}</span>;
}

// ── New Walk-in Modal ───────────────────────────────────────────────────────

interface NewWalkInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    patientId?: string;
    name: string;
    phone: string;
    reason: string;
    priority: Priority;
  }) => void;
  tenantCountry: string;
}

function NewWalkInModal({ isOpen, onClose, onSubmit, tenantCountry }: NewWalkInModalProps) {
  const { t } = useTranslation();
  const [patientId, setPatientId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [showNewPatient, setShowNewPatient] = useState(false);

  const { data: servicesData } = useServiceList({ isActive: true, limit: 100 });
  const { data: patientData } = usePatientList({
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const createPatientMutation = useCreatePatient();

  const patientOptions = useMemo(
    () =>
      (patientData?.patients ?? []).map((p) => ({
        value: p._id,
        label: `${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim() || p.patientCode,
        description: p.phone || p.email || p.patientCode,
      })),
    [patientData],
  );

  // Map from patient id -> patient for auto-fill
  const patientMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof patientData>['patients'][number]>();
    for (const p of patientData?.patients ?? []) map.set(p._id, p);
    return map;
  }, [patientData]);

  const handlePatientSelect = (id: string) => {
    if (!id) {
      // cleared selection
      setPatientId(undefined);
      setName('');
      setPhone('');
      return;
    }
    setPatientId(id);
    const p = patientMap.get(id);
    if (p) {
      setName(`${p.firstName?.en ?? ''} ${p.lastName?.en ?? ''}`.trim());
      setPhone(p.phone ?? '');
    }
  };

  const handleCreatePatient = async (data: CreatePatientInput) => {
    try {
      const res = await createPatientMutation.mutateAsync(data);
      const newPatient = (
        res as {
          data: {
            patient: {
              _id: string;
              firstName: { en: string };
              lastName: { en: string };
              phone?: string;
            };
          };
        }
      ).data.patient;
      setPatientId(newPatient._id);
      setName(`${newPatient.firstName?.en ?? ''} ${newPatient.lastName?.en ?? ''}`.trim());
      setPhone(newPatient.phone ?? '');
      setShowNewPatient(false);
      toast.success(t('appointments.toast.patientCreated'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create patient';
      toast.error(message);
    }
  };

  const resetForm = () => {
    setPatientId(undefined);
    setName('');
    setPhone('');
    setReason('');
    setPriority('normal');
    setShowNewPatient(false);
  };

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ patientId, name, phone, reason, priority });
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operations.walkIn.title')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              resetForm();
              onClose();
            }}
            aria-label={t('operations.action.closeDialog')}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Patient search */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('operations.walkIn.patientName')} *
              </label>
              <SearchCombobox
                options={patientOptions}
                value={patientId ?? ''}
                onValueChange={handlePatientSelect}
                placeholder={t('operations.walkIn.placeholder.patientName')}
                searchPlaceholder={t('appointments.form.patientSearch')}
                emptyMessage={t('appointments.form.patientEmpty')}
                footerAction={
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sm"
                    onClick={() => setShowNewPatient(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('appointments.form.newPatient')}
                  </Button>
                }
              />
            </div>
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('operations.walkIn.phone')}
              </label>
              <PhoneInput
                value={phone}
                onChange={(v) => setPhone(v)}
                defaultCountry={tenantCountry}
                disabled={!!patientId}
              />
            </div>
            {/* Service / Reason */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('operations.walkIn.reason')}
              </label>
              <select
                aria-label={t('operations.walkIn.reason')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t('operations.walkIn.selectService')}</option>
                {(servicesData?.items ?? []).map((s) => (
                  <option key={s._id} value={s.name.en}>
                    {s.name.en}
                  </option>
                ))}
              </select>
            </div>
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('operations.walkIn.priority')}
              </label>
              <select
                aria-label={t('operations.walkIn.priority')}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="low">{t('operations.priority.low')}</option>
                <option value="normal">{t('operations.priority.normal')}</option>
                <option value="high">{t('operations.priority.high')}</option>
                <option value="emergency">{t('operations.priority.emergency')}</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                {t('operations.walkIn.cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!patientId}
              >
                {t('operations.walkIn.add')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Inline New Patient Dialog */}
      <Dialog open={showNewPatient} onOpenChange={setShowNewPatient}>
        <DialogContent className="max-w-4xl">
          <PatientForm
            onSubmit={handleCreatePatient}
            isPending={createPatientMutation.isPending}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Assign Chair Modal ──────────────────────────────────────────────────────

interface AssignChairModalProps {
  isOpen: boolean;
  entry: QueueEntry | null;
  chairs: Chair[];
  doctors: Doctor[];
  onClose: () => void;
  onAssign: (entryId: string, chairId: string, doctorId: string) => void;
}

function AssignChairModal({
  isOpen,
  entry,
  chairs,
  doctors,
  onClose,
  onAssign,
}: AssignChairModalProps) {
  const { t } = useTranslation();
  const [selectedChair, setSelectedChair] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>(entry?.doctorId || '');

  if (!isOpen || !entry) return null;

  const availableChairs = chairs.filter((c) => c.status === 'available');
  const unavailableChairs = chairs.filter((c) => c.status !== 'available');

  const handleAssign = () => {
    if (selectedChair) {
      onAssign(entry.id, selectedChair, selectedDoctor);
      setSelectedChair('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operations.assign.title')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t('operations.action.closeDialog')}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('operations.assign.patient')}</p>
            <p className="font-medium">
              {entry.patientName}{' '}
              {entry.queueNumber ? `(#${String(entry.queueNumber).padStart(3, '0')})` : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('operations.assign.doctor')}
            </label>
            <select
              aria-label={t('operations.assign.selectDoctor')}
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">{t('operations.assign.selectDoctorPlaceholder')}</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">{t('operations.assign.availableChairs')}</p>
            <div className="space-y-2">
              {availableChairs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('operations.assign.noChairs')}</p>
              ) : (
                availableChairs.map((chair) => (
                  <label
                    key={chair.id}
                    className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-accent ${
                      selectedChair === chair.id ? 'border-emerald-500 bg-emerald-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="chair"
                      value={chair.id}
                      checked={selectedChair === chair.id}
                      onChange={(e) => setSelectedChair(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-green-500">🟢</span>
                    <span>
                      {chair.name} ({chair.chairType})
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {unavailableChairs.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 text-muted-foreground">
                {t('operations.assign.unavailable')}
              </p>
              <div className="space-y-2 opacity-50">
                {unavailableChairs.map((chair) => (
                  <div key={chair.id} className="flex items-center gap-3 p-3 border rounded-md">
                    <span
                      className={
                        chair.status === 'maintenance' ? 'text-yellow-500' : 'text-red-500'
                      }
                    >
                      {chair.status === 'maintenance' ? '🟡' : '🔴'}
                    </span>
                    <span>
                      {chair.name}
                      {chair.currentPatient && ` — ${chair.currentPatient.name}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('operations.assign.cancel')}
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={!selectedChair}
              onClick={handleAssign}
            >
              {t('operations.assign.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map API walk-in priority to UI priority */
function mapPriority(p: string): Priority {
  switch (p) {
    case 'urgent':
      return 'high';
    case 'emergency':
      return 'emergency';
    default:
      return 'normal';
  }
}

/** Map API walk-in status to UI status */
function mapWalkInStatus(s: string): WalkInStatus {
  if (s === 'in_progress') return 'in_chair' as WalkInStatus;
  return s as WalkInStatus;
}

/** Map API appointment status to UI status */
function mapApptStatus(s: string): AppointmentStatus {
  switch (s) {
    case 'booked':
    case 'confirmed':
      return 'pending';
    case 'arrived':
      return 'arrived';
    case 'in_progress':
      return 'in_chair';
    case 'completed':
      return 'completed';
    case 'no_show':
      return 'no_show';
    default:
      return 'pending';
  }
}

/** Convert WalkInEntry from API → QueueEntry for UI */
function walkInToQueueEntry(e: WalkInEntry): QueueEntry {
  const waitMs =
    e.status === 'waiting' || e.status === 'called'
      ? Date.now() - new Date(e.createdAt).getTime()
      : 0;
  return {
    id: e._id,
    queueNumber: e.queueNumber,
    patientName: e.patientName,
    patientId: e.patientId ?? null,
    type: 'walk_in',
    time: new Date(e.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    doctorId: e.doctorId ?? null,
    doctorName: e.doctorName ?? null,
    chairId: e.chairId ?? null,
    chairName: e.chairId ? `Chair ${e.chairId}` : null,
    status: mapWalkInStatus(e.status),
    priority: mapPriority(e.priority),
    waitMinutes: Math.round(waitMs / 60_000),
    reason: e.reason,
  };
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function DailyOpsPage() {
  const tenantCountry = useTenantCountry();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [showNewWalkIn, setShowNewWalkIn] = useState(false);
  const [showAssignChair, setShowAssignChair] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [isLive, setIsLive] = useState(true);

  // ── Ticking clock for elapsed-time counters (updates every 60s) ──
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── Branch selection ────────────────────────────────────
  const { data: branches } = useActiveBranches();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Auto-select primary or first branch
  const branchId = useMemo(() => {
    if (selectedBranchId) return selectedBranchId;
    if (!branches?.length) return '';
    const primary = branches.find((b) => b.isPrimary);
    return primary?._id ?? branches[0]._id;
  }, [selectedBranchId, branches]);

  const currentBranch = useMemo(
    () => branches?.find((b) => b._id === branchId),
    [branches, branchId],
  );

  // ── Data hooks ──────────────────────────────────────────
  const {
    data: queueData,
    isLoading: queueLoading,
    isError: queueError,
  } = useQueueList({
    branchId,
    limit: 100,
  });
  const { data: stats } = useQueueStats(branchId);
  const {
    data: todayAppts,
    isLoading: apptsLoading,
    isError: apptsError,
  } = useTodayAppointments(branchId);
  const { data: doctorsData } = useDoctorList({ branchId, isActive: true, limit: 50 });

  // ── Mutations ───────────────────────────────────────────
  const registerMutation = useRegisterWalkIn();
  const callMutation = useCallPatient();
  const startMutation = useStartTreatment();
  const completeMutation = useCompleteTreatment();
  const noShowMutation = useMarkNoShow();
  const apptStatusMutation = useUpdateAppointmentStatus();

  // ── Derive chairs from branch ───────────────────────────
  const chairs: Chair[] = useMemo(() => {
    if (!currentBranch?.chairs) return [];
    // Walk-in entries that are currently in_progress give us occupied chairs
    const inProgressWalkIns = queueData?.entries?.filter((e) => e.status === 'in_progress') ?? [];
    // Appointments that are in_progress with a chair assigned
    const inProgressAppts = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && a.status === 'in_progress' && a.chairNumber,
    );

    return currentBranch.chairs
      .filter((c) => c.isActive)
      .map((c) => {
        // Check walk-in occupant
        const walkInOccupant = inProgressWalkIns.find((e) => e.chairId === String(c.number));
        // Check appointment occupant
        const apptOccupant = !walkInOccupant
          ? inProgressAppts.find((a) => a.chairNumber === c.number)
          : null;
        const isOccupied = !!walkInOccupant || !!apptOccupant;
        const chairStatus: ChairStatus = isOccupied ? 'occupied' : 'available';

        let currentPatient: Chair['currentPatient'];
        if (walkInOccupant) {
          currentPatient = {
            name: walkInOccupant.patientName,
            doctorName: walkInOccupant.doctorName ?? '—',
            startedAt: walkInOccupant.startedAt
              ? new Date(walkInOccupant.startedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
              : '—',
            minutesElapsed: walkInOccupant.startedAt
              ? Math.round((now - new Date(walkInOccupant.startedAt).getTime()) / 60_000)
              : 0,
          };
        } else if (apptOccupant) {
          const patientName = apptOccupant.patient
            ? `${apptOccupant.patient.firstName.en} ${apptOccupant.patient.lastName.en}`
            : '—';
          const doctorName = apptOccupant.doctor
            ? `${apptOccupant.doctor.firstName} ${apptOccupant.doctor.lastName}`
            : '—';
          currentPatient = {
            name: patientName,
            doctorName,
            startedAt: apptOccupant.startedAt ?? apptOccupant.startTime,
            minutesElapsed: apptOccupant.startedAt
              ? Math.round((now - new Date(apptOccupant.startedAt).getTime()) / 60_000)
              : 0,
          };
        }

        return {
          id: String(c.number),
          name: c.name || `Chair ${String(c.number)}`,
          chairNumber: c.number,
          chairType: (c.equipmentType === 'surgical'
            ? 'surgery'
            : (c.equipmentType ?? 'standard')) as Chair['chairType'],
          status: chairStatus,
          currentPatient,
        };
      });
  }, [currentBranch, queueData, todayAppts, now]);

  // ── Derive doctors for modals ───────────────────────────
  const doctors: Doctor[] = useMemo(() => {
    if (!doctorsData?.items) return [];
    return doctorsData.items.map((d) => ({
      id: d._id,
      name: `${d.firstName} ${d.lastName}`,
    }));
  }, [doctorsData]);

  // ── Merge walk-ins + appointments into unified queue ────
  const queue: QueueEntry[] = useMemo(() => {
    const walkIns = (queueData?.entries ?? []).map(walkInToQueueEntry);

    // Map today's scheduled appointments (exclude walk-ins — those are in the queue already)
    const appts: QueueEntry[] = (todayAppts ?? [])
      .filter((a) => !a.isWalkIn)
      .map((a) => ({
        id: a._id,
        queueNumber: null,
        patientName: a.patient ? `${a.patient.firstName.en} ${a.patient.lastName.en}` : '—',
        patientId: a.patientId,
        type: 'appointment' as PatientType,
        time: a.startTime,
        doctorId: a.doctorId,
        doctorName: a.doctor ? `${a.doctor.firstName} ${a.doctor.lastName}` : null,
        chairId: a.chairNumber ? String(a.chairNumber) : null,
        chairName: a.chairNumber ? `Chair ${String(a.chairNumber)}` : null,
        status: mapApptStatus(a.status),
        priority: 'normal' as Priority,
        waitMinutes: 0,
        reason: a.reason,
      }));

    return [...walkIns, ...appts];
  }, [queueData, todayAppts]);

  // Format today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Computed stats (merge API stats + appointments) ─────
  const computedStats = useMemo(() => {
    const apptScheduled = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && (a.status === 'booked' || a.status === 'confirmed'),
    ).length;
    const apptArrived = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && a.status === 'arrived',
    ).length;
    const apptInProgress = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && a.status === 'in_progress',
    ).length;
    const apptCompleted = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && a.status === 'completed',
    ).length;
    const apptNoShow = (todayAppts ?? []).filter(
      (a) => !a.isWalkIn && a.status === 'no_show',
    ).length;

    return {
      scheduled: apptScheduled + (stats?.waiting ?? 0),
      arrived: apptArrived + (stats?.called ?? 0),
      waiting: (stats?.waiting ?? 0) + apptArrived,
      inChair: (stats?.inProgress ?? 0) + apptInProgress,
      completed: (stats?.completed ?? 0) + apptCompleted,
      noShow: (stats?.noShow ?? 0) + apptNoShow,
    };
  }, [stats, todayAppts]);

  // Filter queue based on active tab
  const filteredQueue = useMemo(() => {
    switch (activeTab) {
      case 'scheduled':
        return queue.filter((e) => e.type === 'appointment' && e.status === 'pending');
      case 'walk_ins':
        return queue.filter((e) => e.type === 'walk_in');
      case 'waiting':
        return queue.filter(
          (e) => e.status === 'arrived' || e.status === 'waiting' || e.status === 'called',
        );
      case 'in_chair':
        return queue.filter((e) => e.status === 'in_chair');
      default:
        return queue;
    }
  }, [activeTab, queue]);

  // Sort queue: Priority DESC, then wait time ASC
  const sortedQueue = useMemo(() => {
    const priorityOrder: Record<Priority, number> = { emergency: 4, high: 3, normal: 2, low: 1 };
    return [...filteredQueue].sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.waitMinutes - b.waitMinutes;
    });
  }, [filteredQueue]);

  // Handle actions via mutations
  const handleAction = (action: string, entry: QueueEntry) => {
    switch (action) {
      case 'arrived':
        if (entry.type === 'appointment') {
          apptStatusMutation.mutate({ id: entry.id, status: 'arrived' });
        }
        break;
      case 'no_show':
        if (entry.type === 'walk_in') {
          noShowMutation.mutate(entry.id);
        } else {
          apptStatusMutation.mutate({ id: entry.id, status: 'no_show' });
        }
        break;
      case 'call':
        if (entry.type === 'walk_in' && doctors.length > 0) {
          callMutation.mutate({ id: entry.id, doctorId: entry.doctorId ?? doctors[0].id });
        } else if (entry.type === 'appointment') {
          // If doctor + chair already assigned AND the chair is available → skip modal
          if (entry.doctorId && entry.chairId) {
            const chair = chairs.find((c) => c.id === entry.chairId);
            if (chair && chair.status === 'available') {
              apptStatusMutation.mutate({
                id: entry.id,
                status: 'in_progress',
                chairNumber: parseInt(entry.chairId, 10) || undefined,
              });
              break;
            }
          }
          // Otherwise open assign-chair modal
          setSelectedEntry(entry);
          setShowAssignChair(true);
        }
        break;
      case 'assign_chair':
        setSelectedEntry(entry);
        setShowAssignChair(true);
        break;
      case 'complete':
        if (entry.type === 'walk_in') {
          completeMutation.mutate(entry.id);
        } else {
          apptStatusMutation.mutate({ id: entry.id, status: 'completed' });
        }
        break;
    }
  };

  // Handle new walk-in via API
  const handleNewWalkIn = (data: {
    patientId?: string;
    name: string;
    phone: string;
    reason: string;
    priority: Priority;
  }) => {
    if (!branchId) return;
    registerMutation.mutate({
      branchId,
      patientId: data.patientId,
      patientName: data.name,
      phone: data.phone || undefined,
      reason: data.reason || undefined,
      priority:
        data.priority === 'high' ? 'urgent' : (data.priority as 'normal' | 'urgent' | 'emergency'),
    });
  };

  // Handle chair assignment — starts treatment for walk-ins, updates status for appointments
  const handleAssignChair = (entryId: string, chairId: string, doctorId: string) => {
    const entry = queue.find((e) => e.id === entryId);
    if (!entry) return;
    if (entry.type === 'walk_in') {
      startMutation.mutate({ id: entryId, chairId, doctorId: doctorId || undefined });
    } else {
      // For appointments: transition to in_progress with chair assignment
      apptStatusMutation.mutate({
        id: entryId,
        status: 'in_progress',
        chairNumber: parseInt(chairId, 10) || undefined,
      });
    }
  };

  const isLoading = queueLoading || apptsLoading;
  const isError = queueError || apptsError;

  if (isLoading && !queue.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError && !queue.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium text-destructive">Failed to load daily operations</p>
        <p className="text-sm text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('operations.title')}</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {today} <span className="mx-2">•</span>
            {branches && branches.length > 1 ? (
              <select
                aria-label={t('operations.branch.select')}
                value={branchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent border-none text-muted-foreground cursor-pointer focus:outline-none"
              >
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>
                    🏥 {b.name.en}
                  </option>
                ))}
              </select>
            ) : (
              <span>🏥 {currentBranch?.name.en ?? t('operations.branch.loading')}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className={isLive ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            <RefreshCw className={`h-4 w-4 me-1 ${isLive ? 'animate-spin' : ''}`} />
            {isLive ? t('operations.live') : t('operations.paused')}
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label={t('operations.stat.scheduled')}
          value={computedStats.scheduled}
          icon={Calendar}
          color="bg-blue-50 border-blue-200 text-blue-700"
        />
        <StatCard
          label={t('operations.stat.arrived')}
          value={computedStats.arrived}
          icon={Users}
          color="bg-green-50 border-green-200 text-green-700"
        />
        <StatCard
          label={t('operations.stat.waiting')}
          value={computedStats.waiting}
          icon={Clock}
          color="bg-yellow-50 border-yellow-200 text-yellow-700"
        />
        <StatCard
          label={t('operations.stat.inChair')}
          value={computedStats.inChair}
          icon={Armchair}
          color="bg-red-50 border-red-200 text-red-700"
        />
        <StatCard
          label={t('operations.stat.completed')}
          value={computedStats.completed}
          icon={CheckCircle2}
          color="bg-emerald-50 border-emerald-200 text-emerald-700"
        />
        <StatCard
          label={t('operations.stat.noShow')}
          value={computedStats.noShow}
          icon={XCircle}
          color="bg-gray-50 border-gray-200 text-gray-700"
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              onClick={() => setActiveTab(tab)}
              className={`rounded-none border-b-2 px-4 py-2 text-sm font-medium ${
                activeTab === tab
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(
                tab === 'all'
                  ? 'operations.tab.allToday'
                  : tab === 'scheduled'
                    ? 'operations.tab.scheduled'
                    : tab === 'walk_ins'
                      ? 'operations.tab.walkIns'
                      : tab === 'waiting'
                        ? 'operations.tab.waitingRoom'
                        : 'operations.tab.inChair',
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.patient')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.type')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.priority')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.reason')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.time')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.doctor')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.chair')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.status')}
                  </th>
                  <th className="px-4 py-3 text-start text-sm font-medium">
                    {t('operations.col.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedQueue.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      {t('operations.empty')}
                    </td>
                  </tr>
                ) : (
                  sortedQueue.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="font-medium">{entry.patientName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={entry.type} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={entry.priority} />
                        {entry.priority === 'normal' && (
                          <span className="text-sm text-muted-foreground">
                            {t('operations.priority.normal')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {entry.reason || t('operations.none')}
                      </td>
                      <td className="px-4 py-3 text-sm">{entry.time}</td>
                      <td className="px-4 py-3 text-sm">
                        {entry.doctorName || t('operations.unassigned')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.chairName || t('operations.unassigned')}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ActionButtons entry={entry} onAction={handleAction} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Chair Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4">{t('operations.chairs.title')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {chairs.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">
              {t('operations.chairs.noneConfigured')}
            </p>
          ) : (
            chairs.map((chair) => <ChairCard key={chair.id} chair={chair} />)
          )}
        </div>
      </div>

      {/* New Walk-in Button */}
      <div className="fixed bottom-6 inset-e-6">
        <Button
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
          onClick={() => setShowNewWalkIn(true)}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <Loader2 className="h-5 w-5 me-2 animate-spin" />
          ) : (
            <UserPlus className="h-5 w-5 me-2" />
          )}
          {t('operations.action.newWalkIn')}
        </Button>
      </div>

      {/* Modals */}
      <NewWalkInModal
        isOpen={showNewWalkIn}
        onClose={() => setShowNewWalkIn(false)}
        onSubmit={handleNewWalkIn}
        tenantCountry={tenantCountry}
      />
      <AssignChairModal
        isOpen={showAssignChair}
        entry={selectedEntry}
        chairs={chairs}
        doctors={doctors}
        onClose={() => {
          setShowAssignChair(false);
          setSelectedEntry(null);
        }}
        onAssign={handleAssignChair}
      />
    </div>
  );
}
