import { useState, useEffect } from 'react';
import type { DoctorSchedule } from '../hooks/useSchedules.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  toast,
} from '@dento/ui';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import {
  useCreateDoctorSchedule,
  useUpdateDoctorSchedule,
  useDeleteDoctorSchedule,
} from '../hooks/useSchedules.js';
import { useTranslation } from '../../../stores/locale.store.js';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: DoctorSchedule | null;
}

export default function DoctorScheduleDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const { data: doctorsData } = useDoctorList({ limit: 100 });
  const { data: branches } = useActiveBranches();
  const createMutation = useCreateDoctorSchedule();
  const updateMutation = useUpdateDoctorSchedule();

  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [scheduleType, setScheduleType] = useState<'recurring' | 'override'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isRamadan, setIsRamadan] = useState(false);

  useEffect(() => {
    if (editItem) {
      setDoctorId(editItem.doctorId);
      setBranchId(editItem.branchId);
      setScheduleType(editItem.scheduleType);
      setDayOfWeek(editItem.dayOfWeek ?? 0);
      setSpecificDate(editItem.specificDate ?? '');
      setStartTime(editItem.startTime);
      setEndTime(editItem.endTime);
      setSlotDuration(editItem.slotDuration);
      setIsAvailable(editItem.isAvailable);
      setIsRamadan(editItem.isRamadanSchedule);
    } else {
      setDoctorId('');
      setBranchId('');
      setScheduleType('recurring');
      setDayOfWeek(0);
      setSpecificDate('');
      setStartTime('09:00');
      setEndTime('17:00');
      setSlotDuration(30);
      setIsAvailable(true);
      setIsRamadan(false);
    }
  }, [editItem, open]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async () => {
    if (!editItem && (!doctorId || !branchId)) {
      toast.error(t('schedules.doctorSchedule.validation.required'));
      return;
    }
    try {
      if (editItem) {
        await updateMutation.mutateAsync({
          id: editItem._id,
          data: { startTime, endTime, slotDuration, isAvailable, isRamadanSchedule: isRamadan },
        });
        toast.success(t('schedules.doctorSchedule.toast.updated'));
      } else {
        await createMutation.mutateAsync({
          doctorId,
          branchId,
          scheduleType,
          dayOfWeek: scheduleType === 'recurring' ? dayOfWeek : undefined,
          specificDate: scheduleType === 'override' ? specificDate : undefined,
          startTime,
          endTime,
          slotDuration,
          isAvailable,
          isRamadanSchedule: isRamadan,
        });
        toast.success(t('schedules.doctorSchedule.toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(
        editItem
          ? t('schedules.doctorSchedule.toast.updateFailed')
          : t('schedules.doctorSchedule.toast.createFailed'),
      );
    }
  };

  const doctors = doctorsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem
              ? t('schedules.doctorSchedule.editTitle')
              : t('schedules.doctorSchedule.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!editItem && (
            <>
              <div className="space-y-2">
                <Label>{t('schedules.doctorSchedule.doctor')} *</Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedules.doctorSchedule.selectDoctor')} />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
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
                    {branches?.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {typeof b.name === 'object' ? b.name.en : b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('schedules.doctorSchedule.scheduleType')}</Label>
                <Select
                  value={scheduleType}
                  onValueChange={(v) => setScheduleType(v as 'recurring' | 'override')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">
                      {t('schedules.doctorSchedule.recurring')}
                    </SelectItem>
                    <SelectItem value="override">
                      {t('schedules.doctorSchedule.override')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scheduleType === 'recurring' ? (
                <div className="space-y-2">
                  <Label>{t('schedules.doctorSchedule.dayOfWeek')}</Label>
                  <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((d, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{t('schedules.doctorSchedule.specificDate')}</Label>
                  <Input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                  />
                </div>
              )}
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
          <div className="space-y-2">
            <Label>{t('schedules.doctorSchedule.slotDuration')}</Label>
            <Input
              type="number"
              min={5}
              max={180}
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
            />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.exception.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? t('schedules.action.saving')
              : editItem
                ? t('schedules.action.update')
                : t('schedules.action.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete helper (used from parent) ──────────────────── */
export { useDeleteDoctorSchedule };
