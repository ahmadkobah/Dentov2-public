/**
 * Appointment Detail Panel — displays appointment info in a sheet.
 * BUILD_RULES §8.1.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Separator,
  Input,
  Label,
  Textarea,
} from '@dento/ui';
import {
  Clock,
  User,
  Stethoscope,
  MapPin,
  X,
  CheckCircle,
  MessageSquare,
  Phone,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { AppointmentItem } from '../hooks/useAppointments.js';
import {
  useSendAppointmentNotification,
  useRescheduleAppointment,
} from '../hooks/useAppointments.js';
import type { AppointmentStatus } from '@dento/shared';
import { useThemeStore } from '@/stores/theme.store.js';
import { formatCurrency } from '@/lib/currency.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Status badge config ─────────────────────────────── */

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  booked: 'default',
  confirmed: 'default',
  arrived: 'secondary',
  in_progress: 'secondary',
  completed: 'outline',
  no_show: 'destructive',
  cancelled: 'destructive',
  rescheduled: 'outline',
};

/* ── Props ────────────────────────────────────────────── */

interface AppointmentDetailPanelProps {
  appointment: AppointmentItem | null;
  open: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onCancel: (id: string) => void;
}

/* ── Component ────────────────────────────────────────── */

export function AppointmentDetailPanel({
  appointment,
  open,
  onClose,
  onStatusChange,
  onCancel,
}: AppointmentDetailPanelProps) {
  const locale = useThemeStore((s) => s.locale);
  const { t } = useTranslation();
  const notifyMutation = useSendAppointmentNotification();
  const rescheduleMutation = useRescheduleAppointment();

  // Phase 3.3 — first-class Reschedule action
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState('');
  const [reschedStart, setReschedStart] = useState('');
  const [reschedEnd, setReschedEnd] = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [reschedError, setReschedError] = useState<string | null>(null);

  const openReschedule = () => {
    if (!appointment) return;
    const d =
      typeof appointment.date === 'string'
        ? appointment.date.slice(0, 10)
        : new Date(appointment.date).toISOString().slice(0, 10);
    setReschedDate(d);
    setReschedStart(appointment.startTime);
    setReschedEnd(appointment.endTime);
    setReschedReason('');
    setReschedError(null);
    setRescheduleOpen(true);
  };

  const submitReschedule = () => {
    setReschedError(null);
    if (!appointment) return;
    if (!reschedDate || !reschedStart || !reschedEnd) {
      setReschedError(t('appointments.detail.rescheduleMissingFields') || 'All fields required');
      return;
    }
    rescheduleMutation.mutate(
      {
        id: appointment._id,
        date: reschedDate,
        startTime: reschedStart,
        endTime: reschedEnd,
        reason: reschedReason,
      },
      {
        onSuccess: () => {
          toast.success(t('appointments.detail.rescheduleSuccess') || 'Appointment rescheduled');
          setRescheduleOpen(false);
        },
        onError: (err: unknown) => {
          const message =
            (err as { response?: { data?: { message?: string } }; message?: string })?.response
              ?.data?.message ??
            (err as { message?: string }).message ??
            'Failed to reschedule';
          setReschedError(message);
        },
      },
    );
  };

  const canReschedule = ['booked', 'confirmed', 'arrived'].includes(appointment?.status ?? '');

  if (!appointment) return null;

  const lang = locale === 'ar' ? 'ar' : 'en';
  const patientName = appointment.patient
    ? `${appointment.patient.firstName?.[lang] || appointment.patient.firstName?.en || ''} ${appointment.patient.lastName?.[lang] || appointment.patient.lastName?.en || ''}`.trim()
    : 'Unknown Patient';

  const doctorName = appointment.doctor
    ? `${appointment.doctor.firstName || ''} ${appointment.doctor.lastName || ''}`.trim()
    : 'Unknown Doctor';

  const STATUS_FLOW: AppointmentStatus[] = [
    'booked',
    'confirmed',
    'arrived',
    'in_progress',
    'completed',
  ];

  const currentIdx = STATUS_FLOW.indexOf(appointment.status);
  const nextStatus =
    currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{t('appointments.detail.title')}</DialogTitle>
            <Badge variant={STATUS_VARIANTS[appointment.status] ?? 'default'}>
              {appointment.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient */}
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <User className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-medium text-sm">{patientName}</p>
                {appointment.patient?.phone && !appointment.patient.phone.includes(':') && (
                  <p className="text-xs text-muted-foreground">{appointment.patient.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Phase 1.4 — Medical-history & allergy flags */}
          {(() => {
            const mh = appointment.patient?.medicalHistory;
            const allergiesCount = appointment.patient?.allergies?.length ?? 0;
            const flags: { label: string; key: string }[] = [];
            if (mh?.isPregnant) flags.push({ key: 'preg', label: 'Pregnant' });
            if (mh?.isDiabetes) flags.push({ key: 'dm', label: 'Diabetes' });
            if (mh?.isHypertension) flags.push({ key: 'htn', label: 'Hypertension' });
            if (mh?.isHeartDisease) flags.push({ key: 'cardiac', label: 'Cardiac' });
            if (mh?.isAsthma) flags.push({ key: 'asthma', label: 'Asthma' });
            if (mh?.isBleedingDisorder) flags.push({ key: 'bleed', label: 'Bleeding disorder' });
            if (mh?.isTakingBloodThinners) flags.push({ key: 'thinner', label: 'Anticoagulant' });
            if (mh?.isAllergicToPenicillin) flags.push({ key: 'pen', label: 'Penicillin allergy' });
            if (mh?.isAllergicToAnesthesia)
              flags.push({ key: 'anes', label: 'Anesthesia allergy' });
            if (mh?.isAllergicToLatex) flags.push({ key: 'latex', label: 'Latex allergy' });
            if (allergiesCount > 0)
              flags.push({ key: 'allergies', label: `Allergies: ${allergiesCount}` });

            if (flags.length === 0) return null;
            return (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Medical Alerts
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {flags.map((f) => (
                      <Badge key={f.key} variant="destructive">
                        {f.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Doctor */}
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Stethoscope className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium text-sm">{doctorName}</p>
                <p className="text-xs text-muted-foreground">{t('appointments.detail.doctor')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{appointment.date}</span>
                <span className="text-muted-foreground">·</span>
                <span>
                  {appointment.startTime} – {appointment.endTime}
                </span>
              </div>
              {appointment.chairNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Chair #{appointment.chairNumber}</span>
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">
                  {appointment.type
                    ? appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)
                    : t('appointments.detail.general')}
                </Badge>
                {appointment.isWalkIn && (
                  <Badge variant="secondary">{t('appointments.detail.walkIn')}</Badge>
                )}
                {appointment.appointmentType && (
                  <Badge
                    style={{ backgroundColor: appointment.appointmentType.color, color: '#fff' }}
                  >
                    {appointment.appointmentType.name?.[lang] ||
                      appointment.appointmentType.name?.en}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(appointment.reason || appointment.notes) && (
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                {appointment.reason && (
                  <div>
                    <p className="font-medium">{t('appointments.detail.reason')}</p>
                    <p className="text-muted-foreground">{appointment.reason}</p>
                  </div>
                )}
                {appointment.notes && (
                  <div>
                    <p className="font-medium">{t('appointments.detail.notes')}</p>
                    <p className="text-muted-foreground">{appointment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {appointment.consultationFee != null && (
            <div className="text-sm font-medium">
              {t('appointments.detail.fee')}{' '}
              <span className="text-foreground">{formatCurrency(appointment.consultationFee)}</span>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {nextStatus &&
              !['cancelled', 'no_show'].includes(appointment.status) &&
              (nextStatus === 'confirmed' ? (
                <div className="flex gap-1">
                  <Button
                    onClick={() => {
                      notifyMutation.mutate({ id: appointment._id, channel: 'whatsapp' });
                    }}
                    className="flex-1 rounded-e-none bg-green-600 hover:bg-green-700"
                    disabled={notifyMutation.isPending}
                  >
                    <MessageSquare className="me-2 h-4 w-4" />
                    {t('appointments.detail.sendWhatsApp')}
                  </Button>
                  <Button
                    onClick={() => {
                      notifyMutation.mutate({ id: appointment._id, channel: 'sms' });
                    }}
                    className="flex-1 rounded-s-none bg-blue-600 hover:bg-blue-700"
                    disabled={notifyMutation.isPending}
                  >
                    <Phone className="me-2 h-4 w-4" />
                    {t('appointments.detail.sendSms')}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => onStatusChange(appointment._id, nextStatus)}
                  className="w-full"
                >
                  <CheckCircle className="me-2 h-4 w-4" />
                  {t('appointments.detail.markAs')} {nextStatus.replace('_', ' ')}
                </Button>
              ))}

            {nextStatus === 'confirmed' &&
              !['cancelled', 'no_show'].includes(appointment.status) && (
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(appointment._id, 'confirmed')}
                  className="w-full"
                >
                  <CheckCircle className="me-2 h-4 w-4" />
                  {t('appointments.detail.confirm')}
                </Button>
              )}

            {!['cancelled', 'completed', 'no_show'].includes(appointment.status) && (
              <>
                {canReschedule && (
                  <Button variant="outline" onClick={openReschedule} className="w-full">
                    <CalendarClock className="me-2 h-4 w-4" />
                    {t('appointments.detail.reschedule') || 'Reschedule'}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onStatusChange(appointment._id, 'no_show')}
                  className="w-full"
                >
                  {t('appointments.detail.markNoShow')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onCancel(appointment._id)}
                  className="w-full"
                >
                  <X className="me-2 h-4 w-4" />
                  {t('appointments.detail.cancelAppointment')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Phase 3.3 — Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={(v) => !v && setRescheduleOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('appointments.detail.reschedule') || 'Reschedule appointment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="resched-date">{t('appointments.form.date') || 'Date'}</Label>
              <Input
                id="resched-date"
                type="date"
                value={reschedDate}
                onChange={(e) => setReschedDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="resched-start">{t('appointments.form.startTime') || 'Start'}</Label>
                <Input
                  id="resched-start"
                  type="time"
                  value={reschedStart}
                  onChange={(e) => setReschedStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resched-end">{t('appointments.form.endTime') || 'End'}</Label>
                <Input
                  id="resched-end"
                  type="time"
                  value={reschedEnd}
                  onChange={(e) => setReschedEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="resched-reason">
                {t('appointments.detail.reason') || 'Reason (optional)'}
              </Label>
              <Textarea
                id="resched-reason"
                value={reschedReason}
                onChange={(e) => setReschedReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
            {reschedError && (
              <p className="text-sm text-destructive flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {reschedError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setRescheduleOpen(false)}
                disabled={rescheduleMutation.isPending}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button onClick={submitReschedule} disabled={rescheduleMutation.isPending}>
                {rescheduleMutation.isPending
                  ? t('common.saving') || 'Saving…'
                  : t('appointments.detail.confirmReschedule') || 'Confirm reschedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
