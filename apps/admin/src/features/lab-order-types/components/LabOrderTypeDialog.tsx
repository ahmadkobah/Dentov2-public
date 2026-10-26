import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@dento/ui';
import { useCreateLabOrderType, useUpdateLabOrderType } from '../hooks/useLabOrderTypes.js';
import type { LabOrderType } from '../hooks/useLabOrderTypes.js';
import { useSupportedLanguages } from '@/hooks/useSupportedLanguages.js';
import { useTranslation } from '../../../stores/locale.store.js';

const CATEGORIES = [
  'crown_bridge',
  'veneers',
  'removable',
  'appliances',
  'orthodontics',
  'implants',
  'diagnostics',
  'other',
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: LabOrderType | null;
}

export default function LabOrderTypeDialog({ open, onOpenChange, editItem }: Props) {
  const { t } = useTranslation();
  const { isMultiLang } = useSupportedLanguages();
  const createMutation = useCreateLabOrderType();
  const updateMutation = useUpdateLabOrderType();

  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [description, setDescription] = useState('');
  const [defaultTurnaroundDays, setDefaultTurnaroundDays] = useState(7);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  useEffect(() => {
    if (open) {
      if (editItem) {
        const name = editItem.name;
        setNameEn(typeof name === 'string' ? name : (name?.en ?? ''));
        setNameAr(typeof name === 'string' ? '' : (name?.ar ?? ''));
        setCategory(editItem.category ?? 'other');
        setDescription(editItem.description ?? '');
        setDefaultTurnaroundDays(editItem.defaultTurnaroundDays ?? 7);
        setIsActive(editItem.isActive ?? true);
        setSortOrder(editItem.sortOrder ?? 0);
      } else {
        setNameEn('');
        setNameAr('');
        setCategory('other');
        setDescription('');
        setDefaultTurnaroundDays(7);
        setIsActive(true);
        setSortOrder(0);
      }
    }
  }, [open, editItem]);

  const handleSubmit = useCallback(async () => {
    if (!nameEn.trim()) return;

    const payload: Record<string, unknown> = {
      name: { en: nameEn.trim(), ar: nameAr.trim() || '' },
      category,
      description: description.trim() || undefined,
      defaultTurnaroundDays,
      isActive,
      sortOrder,
    };

    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem._id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch {
      // toast handled by hooks
    }
  }, [
    nameEn,
    nameAr,
    category,
    description,
    defaultTurnaroundDays,
    isActive,
    sortOrder,
    editItem,
    createMutation,
    updateMutation,
    onOpenChange,
  ]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editItem ? t('labOrderTypes.dialog.editTitle') : t('labOrderTypes.dialog.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name EN + AR */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrderTypes.form.nameEn')} *</Label>
              <Input
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Zirconia Crown"
              />
            </div>
            {isMultiLang && (
              <div className="space-y-2">
                <Label>{t('labOrderTypes.form.nameAr')}</Label>
                <Input
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="تاج زركونيا"
                  dir="rtl"
                />
              </div>
            )}
          </div>

          {/* Category + Turnaround */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrderTypes.form.category')} *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`labOrderTypes.category.${cat}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('labOrderTypes.form.turnaroundDays')}</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={defaultTurnaroundDays}
                onChange={(e) => setDefaultTurnaroundDays(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t('labOrderTypes.form.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('labOrderTypes.form.descriptionPlaceholder')}
              rows={2}
            />
          </div>

          {/* Sort Order */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('labOrderTypes.form.sortOrder')}</Label>
              <Input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Active toggle */}
          {editItem && (
            <div className="flex items-center justify-between">
              <Label>{t('labOrderTypes.form.isActive')}</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !nameEn.trim()}>
            {isPending
              ? t('common.actions.saving')
              : editItem
                ? t('common.actions.update')
                : t('common.actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
