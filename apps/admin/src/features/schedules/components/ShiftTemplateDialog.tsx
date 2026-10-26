import { useState, useEffect } from 'react';
import type { ShiftTemplate } from '../hooks/useSchedules.js';
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
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import { useCreateShiftTemplate, useUpdateShiftTemplate } from '../hooks/useSchedules.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

const SHIFT_TYPES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'split', label: 'Split' },
  { value: 'custom', label: 'Custom' },
];

const APPLICABLE_ROLES = ['dentist', 'hygienist', 'assistant', 'receptionist', 'manager', 'admin'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: ShiftTemplate | null;
}

export default function ShiftTemplateDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const { data: branches } = useActiveBranches();
  const createMutation = useCreateShiftTemplate();
  const updateMutation = useUpdateShiftTemplate();

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakDuration, setBreakDuration] = useState(30);
  const [shiftType, setShiftType] = useState('morning');
  const [color, setColor] = useState('#3b82f6');
  const [branchId, setBranchId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (open) {
      if (editItem) {
        setNameEn(typeof editItem.name === 'object' ? editItem.name.en : (editItem.name ?? ''));
        setNameAr(
          typeof editItem.name === 'object'
            ? ((editItem.name as { en: string; ar?: string }).ar ?? '')
            : '',
        );
        setStartTime(editItem.startTime ?? '09:00');
        setEndTime(editItem.endTime ?? '17:00');
        setBreakDuration(editItem.breakDuration ?? 30);
        setShiftType(editItem.shiftType ?? 'morning');
        setColor(editItem.color ?? '#3b82f6');
        setBranchId(editItem.branchId ?? '');
        setSelectedRoles(editItem.applicableRoles ?? []);
        setIsDefault(editItem.isDefault ?? false);
      } else {
        setNameEn('');
        setNameAr('');
        setStartTime('09:00');
        setEndTime('17:00');
        setBreakDuration(30);
        setShiftType('morning');
        setColor('#3b82f6');
        setBranchId('');
        setSelectedRoles([]);
        setIsDefault(false);
      }
    }
  }, [open, editItem]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSubmit = async () => {
    if (!nameEn) {
      toast.error(t('schedules.shift.validation.nameRequired'));
      return;
    }
    const payload = {
      name: { en: nameEn, ar: nameAr || '' },
      startTime,
      endTime,
      breakDuration,
      shiftType: shiftType as 'morning' | 'afternoon' | 'evening' | 'night' | 'split' | 'custom',
      color,
      branchId: branchId || undefined,
      applicableRoles: selectedRoles.length > 0 ? selectedRoles : [],
      isDefault,
    };
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem._id, data: payload });
        toast.success(t('schedules.shift.toast.updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('schedules.shift.toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(
        editItem
          ? t('schedules.shift.toast.updateFailed')
          : t('schedules.shift.toast.createFailed'),
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('schedules.shift.editTitle') : t('schedules.shift.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.shift.nameEn')} *</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Morning Shift"
              />
            </div>
            {isMultiLang && (
              <div className="space-y-2">
                <Label>{t('schedules.shift.nameAr')}</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="وردية صباحية"
                  dir="rtl"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.shift.startTime')}</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.shift.endTime')}</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.shift.breakDuration')}</Label>
              <Input
                type="number"
                min={0}
                max={120}
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.shift.shiftType')}</Label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.shift.color')}</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.shift.branch')}</Label>
              <Select
                value={branchId || '__none__'}
                onValueChange={(v) => setBranchId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('schedules.exception.allBranches')} />
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
          </div>
          <div className="space-y-2">
            <Label>{t('schedules.shift.applicableRoles')}</Label>
            <div className="flex flex-wrap gap-2">
              {APPLICABLE_ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={selectedRoles.includes(role) ? 'default' : 'outline'}
                  onClick={() => toggleRole(role)}
                  className="capitalize"
                >
                  {role}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.shift.isDefault')}</Label>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.shift.cancel')}
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
