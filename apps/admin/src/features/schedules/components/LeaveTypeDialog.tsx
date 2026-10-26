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
  Switch,
  toast,
} from '@dento/ui';
import { useCreateLeaveType, useUpdateLeaveType } from '@/features/leave/hooks/useLeave.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface LeaveType {
  _id: string;
  name: string | { en: string; ar?: string };
  code?: string;
  maxDaysPerYear?: number;
  isPaid?: boolean;
  isApprovalRequired?: boolean;
  maxDaysPerRequest?: number;
  color?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: LeaveType | null;
}

export default function LeaveTypeDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const createMutation = useCreateLeaveType();
  const updateMutation = useUpdateLeaveType();

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [code, setCode] = useState('');
  const [maxDaysPerYear, setMaxDaysPerYear] = useState(21);
  const [isPaid, setIsPaid] = useState(true);
  const [isApprovalRequired, setIsApprovalRequired] = useState(true);
  const [maxDaysPerRequest, setMaxDaysPerRequest] = useState<number | ''>('');
  const [color, setColor] = useState('#3b82f6');

  useEffect(() => {
    if (open) {
      if (editItem) {
        setNameEn(typeof editItem.name === 'object' ? editItem.name.en : (editItem.name ?? ''));
        setNameAr(
          typeof editItem.name === 'object'
            ? ((editItem.name as { en: string; ar?: string }).ar ?? '')
            : '',
        );
        setCode(editItem.code ?? '');
        setMaxDaysPerYear(editItem.maxDaysPerYear ?? 21);
        setIsPaid(editItem.isPaid ?? true);
        setIsApprovalRequired(editItem.isApprovalRequired ?? true);
        setMaxDaysPerRequest(editItem.maxDaysPerRequest ?? '');
        setColor(editItem.color ?? '#3b82f6');
      } else {
        setNameEn('');
        setNameAr('');
        setCode('');
        setMaxDaysPerYear(21);
        setIsPaid(true);
        setIsApprovalRequired(true);
        setMaxDaysPerRequest('');
        setColor('#3b82f6');
      }
    }
  }, [open, editItem]);

  const handleSubmit = async () => {
    if (!nameEn) {
      toast.error(t('schedules.leaveType.validation.nameRequired'));
      return;
    }
    const payload = {
      name: { en: nameEn, ar: nameAr || '' },
      code: code || '',
      maxDaysPerYear,
      isPaid,
      isApprovalRequired,
      maxDaysPerRequest: maxDaysPerRequest !== '' ? Number(maxDaysPerRequest) : undefined,
      color: color || undefined,
    };
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem._id, data: payload });
        toast.success(t('schedules.leaveType.toast.updated'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('schedules.leaveType.toast.created'));
      }
      onOpenChange(false);
    } catch {
      toast.error(
        editItem
          ? t('schedules.leaveType.toast.updateFailed')
          : t('schedules.leaveType.toast.createFailed'),
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('schedules.leaveType.editTitle') : t('schedules.leaveType.addTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.leaveType.nameEn')} *</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="Annual Leave"
              />
            </div>
            {isMultiLang && (
              <div className="space-y-2">
                <Label>{t('schedules.leaveType.nameAr')}</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="إجازة سنوية"
                  dir="rtl"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.leaveType.code')}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="AL" />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.leaveType.maxDaysPerYear')}</Label>
              <Input
                type="number"
                min={1}
                value={maxDaysPerYear}
                onChange={(e) => setMaxDaysPerYear(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.leaveType.maxDaysPerRequest')}</Label>
              <Input
                type="number"
                min={1}
                value={maxDaysPerRequest}
                onChange={(e) => setMaxDaysPerRequest(e.target.value ? Number(e.target.value) : '')}
                placeholder={t('schedules.leaveType.noLimit')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.leaveType.color')}</Label>
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
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.leaveType.isPaid')}</Label>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('schedules.leaveType.requiresApproval')}</Label>
            <Switch checked={isApprovalRequired} onCheckedChange={setIsApprovalRequired} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.leaveType.cancel')}
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
