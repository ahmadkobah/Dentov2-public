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
  toast,
} from '@dento/ui';
import { useLeaveTypeList, useCreateLeaveRequest } from '@/features/leave/hooks/useLeave.js';
import { useTranslation } from '../../../stores/locale.store.js';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LeaveRequestDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const { data: leaveTypesData } = useLeaveTypeList({});
  const createMutation = useCreateLeaveRequest();

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setLeaveTypeId('');
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error(t('schedules.leaveRequest.validation.required'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        leaveTypeId,
        startDate,
        endDate,
        reason: reason || undefined,
        attachments: [],
      });
      toast.success(t('schedules.leaveRequest.toast.created'));
      onOpenChange(false);
    } catch {
      toast.error(t('schedules.leaveRequest.toast.createFailed'));
    }
  };

  const leaveTypes = leaveTypesData?.types ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('schedules.leaveRequest.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('schedules.leaveRequest.leaveType')} *</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder={t('schedules.leaveRequest.selectType')} />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(leaveTypes) ? leaveTypes : []).map(
                  (lt: { _id: string; name: string | { en: string } }) => (
                    <SelectItem key={lt._id} value={lt._id}>
                      {typeof lt.name === 'object' ? lt.name.en : lt.name}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('schedules.leaveRequest.startDate')} *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('schedules.leaveRequest.endDate')} *</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('schedules.leaveRequest.reason')}</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('schedules.leaveRequest.reasonPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('schedules.leaveRequest.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending
              ? t('schedules.leaveRequest.submitting')
              : t('schedules.leaveRequest.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
