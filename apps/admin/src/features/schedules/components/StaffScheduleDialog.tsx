import { useState, useEffect } from 'react';
import type { StaffSchedule } from '../hooks/useSchedules.js';
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
import { useUserList } from '@/features/users/hooks/useUsers.js';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import {
  useShiftTemplateList,
  useCreateStaffSchedule,
  useUpdateStaffSchedule,
} from '../hooks/useSchedules.js';
import { useTranslation } from '../../../stores/locale.store.js';

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'swapped', label: 'Swapped' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ROLES = ['dentist', 'hygienist', 'assistant', 'receptionist', 'manager', 'admin'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: StaffSchedule | null;
}

export default function StaffScheduleDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const { data: usersData } = useUserList({ limit: 100, status: 'active' });
  const { data: branches } = useActiveBranches();
  const { data: shiftTemplatesData } = useShiftTemplateList({});
  const createMutation = useCreateStaffSchedule();
  const updateMutation = useUpdateStaffSchedule();

  const [userId, setUserId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [shiftTemplateId, setShiftTemplateId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [isPublished, setIsPublished] = useState(false);
  const [isRamadanSchedule, setIsRamadanSchedule] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (editItem) {
        setUserId(editItem.userId ?? '');
        setBranchId(editItem.branchId ?? '');
        setShiftTemplateId(editItem.shiftTemplateId ?? '');
        setScheduleDate(editItem.scheduleDate ? editItem.scheduleDate.slice(0, 10) : '');
        setDayOfWeek(editItem.dayOfWeek?.toString() ?? '');
        setStartTime(editItem.startTime ?? '09:00');
        setEndTime(editItem.endTime ?? '17:00');
        setRole(editItem.role ?? '');
        setStatus(editItem.status ?? 'scheduled');
        setIsPublished(editItem.isPublished ?? false);
        setIsRamadanSchedule(editItem.isRamadanSchedule ?? false);
        setNotes(((editItem as unknown as Record<string, unknown>).notes as string) ?? '');
      } else {
        setUserId('');
        setBranchId('');
        setShiftTemplateId('');
        setScheduleDate('');
        setDayOfWeek('');
        setStartTime('09:00');
        setEndTime('17:00');
        setRole('');
        setStatus('scheduled');
        setIsPublished(false);
        setIsRamadanSchedule(false);
        setNotes('');
      }
    }
  }, [open, editItem]);

  const handleSubmit = async () => {
    if (!userId || !branchId) {
      toast.error(t('schedules.staff.validation.required'));
      return;
    }
    const payload: Record<string, unknown> = {
      userId,
      branchId,
      shiftTemplateId: shiftTemplateId || undefined,
      scheduleDate: scheduleDate || undefined,
      dayOfWeek: dayOfWeek !== '' ? Number(dayOfWeek) : undefined,
      startTime,
      endTime,
      role: role || undefined,
      status,
      isPublished,
      isRamadanSchedule,
      notes: notes || undefined,
    };
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem._id, data: payload });
        toast.success(t('schedules.staff.toast.updated'));
      } else {
        await createMutation.mutateAsync(payload as never);
        toast.success(t('schedules.staff.toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(
        editItem
          ? t('schedules.staff.toast.updateFailed')
          : t('schedules.staff.toast.createFailed'),
      );
    }
  };

  const users = usersData?.items ?? [];
  const shiftTemplates = shiftTemplatesData?.shifts ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('schedules.staff.editTitle') : t('schedules.staff.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('schedules.staff.staffMember')} *</Label>
            <Select value={userId} onValueChange={setUserId} disabled={!!editItem}>
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.staff.selectStaff')} />
              </SelectTrigger>
              <SelectContent>
                {(
                  users as Array<{
                    _id: string;
                    firstName?: string;
                    lastName?: string;
                    email?: string;
                  }>
                ).map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.firstName && u.lastName
                      ? `${u.firstName} ${u.lastName}`
                      : (u.email ?? u._id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('schedules.staff.branch')} *</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.staff.selectBranch')} />
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
            <Label>{t('schedules.staff.shiftTemplate')}</Label>
            <Select
              value={shiftTemplateId || '__none__'}
              onValueChange={(v) => setShiftTemplateId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.staff.noTemplate')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('schedules.staff.noTemplate')}</SelectItem>
                {(Array.isArray(shiftTemplates) ? shiftTemplates : []).map(
                  (t: { _id: string; name: string | { en: string } }) => (
                    <SelectItem key={t._id} value={t._id}>
                      {typeof t.name === 'object' ? t.name.en : t.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.staff.scheduleDate')}</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.staff.dayOfWeek')}</Label>
              <Select
                value={dayOfWeek || '__none__'}
                onValueChange={(v) => setDayOfWeek(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.staff.startTime')}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.staff.endTime')}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.staff.role')}</Label>
              <Select
                value={role || '__none__'}
                onValueChange={(v) => setRole(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.staff.status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('schedules.staff.notes')}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.staff.isPublished')}</Label>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.staff.isRamadan')}</Label>
            <Switch checked={isRamadanSchedule} onCheckedChange={setIsRamadanSchedule} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.staff.cancel')}
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
