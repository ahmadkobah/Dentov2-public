import { useState, useEffect } from 'react';
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
import { useCreateScheduleException } from '../hooks/useSchedules.js';
import { useTranslation } from '../../../stores/locale.store.js';

const EXCEPTION_TYPES = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'day_off', label: 'Day Off' },
  { value: 'conference', label: 'Conference' },
  { value: 'special_hours', label: 'Special Hours' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExceptionDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { data: doctorsData } = useDoctorList({ limit: 100 });
  const { data: branches } = useActiveBranches();
  const createMutation = useCreateScheduleException();

  const [doctorId, setDoctorId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [exceptionType, setExceptionType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFullDay, setIsFullDay] = useState(true);
  const [specialStartTime, setSpecialStartTime] = useState('09:00');
  const [specialEndTime, setSpecialEndTime] = useState('13:00');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setDoctorId('');
      setBranchId('');
      setExceptionType('vacation');
      setStartDate('');
      setEndDate('');
      setIsFullDay(true);
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!doctorId || !startDate || !endDate) {
      toast.error('Doctor, start date, and end date are required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        doctorId,
        branchId: branchId || undefined,
        exceptionType: exceptionType as
          | 'vacation'
          | 'sick_leave'
          | 'day_off'
          | 'conference'
          | 'special_hours'
          | 'other',
        startDate,
        endDate,
        isFullDay,
        specialStartTime: !isFullDay ? specialStartTime : undefined,
        specialEndTime: !isFullDay ? specialEndTime : undefined,
        reason: reason || undefined,
      });
      toast.success(t('schedules.exception.toast.created'));
      onOpenChange(false);
    } catch {
      toast.error(t('schedules.exception.toast.createFailed'));
    }
  };

  const doctors = doctorsData?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('schedules.exception.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('schedules.exception.doctor')} *</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.exception.selectDoctor')} />
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
            <Label>{t('schedules.exception.branch')}</Label>
            <Select
              value={branchId || '__none__'}
              onValueChange={(v) => setBranchId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('schedules.exception.allBranches')}</SelectItem>
                {branches?.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {typeof b.name === 'object' ? b.name.en : b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('schedules.exception.type')}</Label>
            <Select value={exceptionType} onValueChange={setExceptionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCEPTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.exception.startDate')} *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.exception.endDate')} *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.exception.fullDay')}</Label>
            <Switch checked={isFullDay} onCheckedChange={setIsFullDay} />
          </div>
          {!isFullDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('schedules.exception.startTime')}</Label>
                <Input
                  type="time"
                  value={specialStartTime}
                  onChange={(e) => setSpecialStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('schedules.exception.endTime')}</Label>
                <Input
                  type="time"
                  value={specialEndTime}
                  onChange={(e) => setSpecialEndTime(e.target.value)}
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t('schedules.exception.reason')}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('schedules.exception.reasonPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.exception.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? t('schedules.action.saving') : t('schedules.action.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
